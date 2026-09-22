import { ChatGroq } from "@langchain/groq";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { z } from "zod";
import { buildUpgradeAdvice, listStableVersions } from "@/lib/upgrade-advisor";
import {
  loadUpgradeDetails,
  truncateUpgradeDetailsForAgent,
} from "@/lib/upgrade-details";
import { checkPackageSecurity } from "@/lib/data-fetchers/security";
import { fetchNpmPackageData } from "@/lib/data-fetchers/npm-registry";
import { getGroqUpgradeAgentModel, groqModelLabel } from "@/lib/ai/groq-config";
import {
  formatInstallStep,
  type PackageManagerPreference,
} from "@/lib/package-manager-pref";

const briefSchema = z.object({
  headline: z.string().describe("One-line upgrade verdict"),
  bullets: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe("Key facts grounded in tool results"),
  risk: z
    .enum(["low", "moderate", "high"])
    .describe("Overall upgrade risk"),
  nextSteps: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe(
      "Ordered upgrade checklist. Review breaking risks first, then install with the preferred package manager from the facts.",
    ),
});

export type UpgradeAgentBrief = z.infer<typeof briefSchema>;

export type UpgradeAgentResult = {
  brief: UpgradeAgentBrief;
  model: string;
  toolCalls: string[];
};

const AgentState = Annotation.Root({
  packageName: Annotation<string>,
  from: Annotation<string>,
  to: Annotation<string>,
  packageManager: Annotation<PackageManagerPreference>,
  facts: Annotation<string>,
  toolCalls: Annotation<string[]>,
  brief: Annotation<UpgradeAgentBrief | null>,
});

const INSTALL_CMD_RE =
  /\b(?:npm\s+(?:install|i|update)|pnpm\s+(?:add|update|i)|yarn\s+(?:add|upgrade)|bun\s+add)\b/i;

function installGuidance(pref: PackageManagerPreference): string {
  if (pref === "auto") {
    return (
      "packageManager preference is auto — give install examples for npm, pnpm, and yarn " +
      "(e.g. `npm install pkg@ver`, `pnpm add pkg@ver`, `yarn add pkg@ver`); do not assume only npm."
    );
  }
  const examples: Record<Exclude<PackageManagerPreference, "auto">, string> = {
    npm: "`npm install pkg@version`",
    pnpm: "`pnpm add pkg@version`",
    yarn: "`yarn add pkg@version`",
    bun: "`bun add pkg@version`",
  };
  return `packageManager preference is ${pref} — use ${examples[pref]} for the install step (match this manager only).`;
}

/** Ensure next steps include a concrete install command after an initial review step. */
export function normalizeNextSteps(
  steps: string[],
  packageName: string,
  to: string,
  packageManager: PackageManagerPreference = "auto",
): string[] {
  const cleaned = steps
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const installStep = formatInstallStep(packageManager, packageName, to);
  const installIdx = cleaned.findIndex((s) => INSTALL_CMD_RE.test(s));

  let ordered = cleaned;
  if (installIdx === -1) {
    ordered =
      cleaned.length === 0
        ? [installStep]
        : [cleaned[0], installStep, ...cleaned.slice(1)];
  } else {
    // Rewrite whatever manager the model used to match the user preference.
    ordered = cleaned.map((step, i) =>
      i === installIdx ? installStep : step,
    );
    if (installIdx === 0 && ordered.length > 1) {
      const [install, ...rest] = ordered;
      ordered = [rest[0], install, ...rest.slice(1)];
    }
  }

  return ordered.slice(0, 5);
}

function nextStepsGuidance(packageManager: PackageManagerPreference): string {
  return `nextSteps must be a clear, ordered developer checklist (3–5 items):
1. FIRST: review release notes / breaking-change notes and peer risks — use a real URL from the facts when available; otherwise say to check the package's changelog for this range. Do not invent URLs. Call out named breaking changes from the facts when present.
2. THEN: install/upgrade to the target version. ${installGuidance(packageManager)} Only install after reviewing what may break.
3. If peerDependency changes are listed in the facts, include aligning those peers (name the packages) — typically with or right after the install step.
4. Run the project's tests and typecheck (or build) to catch breakages.
5. Only add further steps if facts justify them (e.g. migrate deprecated APIs named in the notes).
Do NOT invent vague steps like "monitor application logs", "update the package lock and rebuild" as a separate step (the lockfile updates with install), or generic "confirm compatibility" without saying how.
Write in UK English. Do not use "you" or "your".`;
}

function requireGroqKey(): string {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  return key;
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return (
    /\b429\b/.test(message) ||
    /rate.?limit/i.test(message) ||
    /tokens per minute/i.test(message)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) || i === attempts - 1) throw error;
      // Groq often says "try again in ~600ms"; wait a bit longer to clear TPM window.
      await sleep(1500 * (i + 1));
    }
  }
  throw lastError ?? new Error("Request failed");
}

async function collectFacts(state: typeof AgentState.State) {
  const { packageName, from, to } = state;
  const toolCalls: string[] = [];

  const [adviceJson, detailsJson, fromSecJson, toSecJson] = await Promise.all([
    (async () => {
      toolCalls.push("get_upgrade_advice");
      const { data: npm } = await fetchNpmPackageData(packageName);
      const versions = listStableVersions(npm.time);
      const advice = buildUpgradeAdvice({
        from,
        to,
        versionTimes: npm.time,
        versions,
      });
      return {
        headline: advice.headline,
        summary: advice.summary,
        bump: advice.bump,
        verdict: advice.verdict,
        releasesBehind: advice.releasesBehind,
        majorsCrossed: advice.majorsCrossed,
        daysBetween: advice.daysBetween,
        intermediateMajors: advice.intermediateMajors,
        fromClean: advice.fromClean,
        toClean: advice.toClean,
      };
    })(),
    (async () => {
      toolCalls.push("get_upgrade_details");
      const details = await loadUpgradeDetails(packageName, from, to);
      return truncateUpgradeDetailsForAgent(details, 5, 3);
    })(),
    (async () => {
      toolCalls.push("get_version_security:from");
      const security = await checkPackageSecurity(packageName, from);
      return {
        version: from,
        totalCount: security.totalCount,
        critical: security.critical,
        high: security.high,
        moderate: security.moderate,
        low: security.low,
      };
    })(),
    (async () => {
      toolCalls.push("get_version_security:to");
      const security = await checkPackageSecurity(packageName, to);
      return {
        version: to,
        totalCount: security.totalCount,
        critical: security.critical,
        high: security.high,
        moderate: security.moderate,
        low: security.low,
      };
    })(),
  ]);

  const facts = JSON.stringify({
    packageName,
    from,
    to,
    packageManager: state.packageManager,
    advice: adviceJson,
    details: detailsJson,
    security: { from: fromSecJson, to: toSecJson },
  });

  return { facts, toolCalls };
}

async function synthesizeBrief(state: typeof AgentState.State) {
  requireGroqKey();

  const model = getGroqUpgradeAgentModel();
  const llm = new ChatGroq({
    model,
    temperature: 0.2,
    maxTokens: 1024,
    apiKey: process.env.GROQ_API_KEY,
  });

  const structured = llm.withStructuredOutput(briefSchema, {
    name: "upgrade_brief",
  });

  const brief = await withRateLimitRetry(() =>
    structured.invoke([
      {
        role: "system",
        content: `You are an npm upgrade advisor. Write a short brief using ONLY the JSON facts provided. Do not invent versions, advisory counts, or breaking changes. If notes are empty, say so.\n\n${nextStepsGuidance(state.packageManager)}`,
      },
      {
        role: "user",
        content: `Upgrade brief for ${state.packageName}: ${state.from} → ${state.to}.\n\nFacts:\n${state.facts}`,
      },
    ]),
  );

  return {
    brief: {
      ...brief,
      nextSteps: normalizeNextSteps(
        brief.nextSteps ?? [],
        state.packageName,
        state.to,
        state.packageManager,
      ),
    },
  };
}

function buildUpgradeAgentGraph() {
  return new StateGraph(AgentState)
    .addNode("collect", collectFacts)
    .addNode("synthesize", synthesizeBrief)
    .addEdge(START, "collect")
    .addEdge("collect", "synthesize")
    .addEdge("synthesize", END)
    .compile();
}

/**
 * LangGraph upgrade agent: collect tool facts in parallel, then one LLM synthesize step.
 * Avoids multi-round ReAct TPM spikes on Groq free tier.
 */
export async function runUpgradeAgent(input: {
  packageName: string;
  from: string;
  to: string;
  packageManager?: PackageManagerPreference;
}): Promise<UpgradeAgentResult> {
  const { packageName, from, to, packageManager = "auto" } = input;
  requireGroqKey();

  const graph = buildUpgradeAgentGraph();
  const result = await graph.invoke({
    packageName,
    from,
    to,
    packageManager,
    facts: "",
    toolCalls: [],
    brief: null,
  });

  if (!result.brief?.headline) {
    throw new Error("Upgrade agent did not return a structured brief");
  }

  return {
    brief: {
      headline: result.brief.headline,
      bullets: result.brief.bullets ?? [],
      risk: result.brief.risk ?? "moderate",
      nextSteps: normalizeNextSteps(
        result.brief.nextSteps ?? [],
        packageName,
        to,
        packageManager,
      ),
    },
    model: groqModelLabel(getGroqUpgradeAgentModel()),
    toolCalls: result.toolCalls ?? [],
  };
}
