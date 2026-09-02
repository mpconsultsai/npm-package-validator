import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import type { PackageAnalysisResult } from '../types/package-data';
import { formatBytes } from '../utils/format';

/** Groq retired llama-3.3-70b-versatile on 16 Aug 2026; gpt-oss-120b is the documented replacement. */
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_MODEL_LABEL = 'GPT-OSS 120B (Groq)';

/**
 * AI-generated package analysis and recommendations
 */
export interface AIPackageAnalysis {
  summary: string;
  recommendation:
    | "recommended"
    | "use-with-caution"
    | "not-recommended"
    | "do-not-use";
  strengths: string[];
  concerns: string[];
  overallScore: number; // 0-100
  securityRating: "excellent" | "good" | "fair" | "poor";
  qualityRating: "excellent" | "good" | "fair" | "poor";
  maintenanceRating: "excellent" | "good" | "fair" | "poor";
  reasoning: string;
  model?: string; // e.g. "Gemini 2.5 Flash", "GPT-OSS 120B (Groq)"
}

const README_DO_NOT_USE_PATTERNS = [
  /\bthis (?:package|project|module|library|repo(?:sitory)?) (?:is|has been) deprecated\b/i,
  /\b(?:package|project) (?:is|has been) (?:officially )?deprecated\b/i,
  /\bno longer maintained\b/i,
  /\bnot (?:being )?actively maintained\b/i,
  /\b(?:this )?(?:package|project) is unmaintained\b/i,
  /\bthis (?:project|package|repo(?:sitory)?) is archived\b/i,
  /\bend[- ]of[- ]life\b/i,
  /\bdeprecated\.?\s+(?:please |kindly )?(?:use|install|switch to)\b/i,
];

interface PackageHealthFlags {
  deprecated: boolean;
  archived: boolean;
  unmaintained: boolean;
  reasons: string[];
}

function detectPackageHealthFlags(data: PackageAnalysisResult): PackageHealthFlags {
  const reasons: string[] = [];
  const deprecatedMessage = data.npm?.deprecated?.trim();
  const deprecated = Boolean(deprecatedMessage);
  if (deprecated) {
    reasons.push(
      deprecatedMessage!.length > 160
        ? `npm marks this package as deprecated: ${deprecatedMessage!.slice(0, 157)}…`
        : `npm marks this package as deprecated: ${deprecatedMessage}`,
    );
  }

  const archived = Boolean(data.github?.archived);
  if (archived) {
    reasons.push("The GitHub repository is archived.");
  }

  const readme = data.readme ?? "";
  const readmeWarning = README_DO_NOT_USE_PATTERNS.some((pattern) =>
    pattern.test(readme),
  );
  if (readmeWarning && !deprecated) {
    reasons.push(
      "The README contains a deprecation, archive, or migration warning.",
    );
  }

  const lastPublished =
    data.npm?.time && data.npm.version ? data.npm.time[data.npm.version] : null;
  const daysSincePublish = daysSince(lastPublished);
  const daysSinceCommit = daysSince(data.github?.pushed_at);
  const adoption = adoptionLevel(
    data.downloads?.downloads,
    data.github?.stars,
    data.popularity?.dependents,
  );
  const maintenanceScore = data.popularity?.maintenanceScore;

  const longSilent =
    daysSincePublish !== null &&
    daysSincePublish >= 730 &&
    (daysSinceCommit === null || daysSinceCommit >= 365);
  const lowMaintenance =
    typeof maintenanceScore === "number" && maintenanceScore < 0.15;
  const unmaintained =
    !deprecated &&
    !archived &&
    (readmeWarning ||
      (longSilent && adoption !== "widely-adopted") ||
      (longSilent && lowMaintenance));

  if (unmaintained && !readmeWarning) {
    const daysPart =
      daysSincePublish !== null
        ? ` (${daysSincePublish} days since last publish)`
        : "";
    reasons.push(
      `No meaningful maintenance activity for a long time${daysPart} — this package appears unmaintained.`,
    );
  } else if (unmaintained && readmeWarning && reasons.length === 0) {
    reasons.push(
      "The package appears unmaintained based on its README and release history.",
    );
  }

  return {
    deprecated,
    archived,
    unmaintained,
    reasons,
  };
}

/** Group near-duplicate concern lines (e.g. two unmaintained notes) under one theme. */
function concernTheme(text: string): string | null {
  const t = text.toLowerCase();
  if (
    /unmaintain|no meaningful maintenance|maintenance activity|days since (?:its )?last publish|days since publish|abandon|not actively maintained|no longer maintained|lack of (?:any )?activity|lack of future support|not suitable for use in new projects/.test(
      t,
    )
  ) {
    return "maintenance";
  }
  if (/deprecat|end[- ]of[- ]life|migration warning/.test(t)) {
    return "deprecated";
  }
  if (/\barchiv/.test(t)) {
    return "archived";
  }
  if (/bundle|gzip|minified|payload|bundlephobia/.test(t)) {
    return "bundle";
  }
  if (/vulnerab|security advisory|\bcve\b|critical\/high/.test(t)) {
    return "security";
  }
  if (/do not use this package|poses a significant risk/.test(t)) {
    return "do-not-use-lead";
  }
  return null;
}

function dedupeConcerns(concerns: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of concerns) {
    const text = raw.trim();
    if (!text || text.toLowerCase() === "none") continue;

    const theme = concernTheme(text);
    const key =
      theme ??
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }

  return out;
}

/**
 * Build a single reasoning paragraph without repeating the same themes
 * (e.g. unmaintained called out by both our override and the model).
 */
function mergeReasoning(preferred: string[], aiReasoning: string): string {
  const seenThemes = new Set<string>();
  const parts: string[] = [];

  const remember = (text: string) => {
    const theme = concernTheme(text);
    if (theme) seenThemes.add(theme);
    if (/^do not use this package/i.test(text.trim())) {
      seenThemes.add("do-not-use-lead");
    }
  };

  const push = (raw: string) => {
    let text = raw.trim().replace(/\s+/g, " ");
    if (!text) return;

    if (/^do not use this package/i.test(text)) {
      if (seenThemes.has("do-not-use-lead")) return;
      seenThemes.add("do-not-use-lead");
    }

    const theme = concernTheme(text);
    if (theme && seenThemes.has(theme)) return;

    remember(text);
    if (!/[.!?]$/.test(text)) text = `${text}.`;
    parts.push(text);
  };

  for (const part of preferred) {
    push(part);
  }

  const sentences = aiReasoning
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    push(sentence);
  }

  return parts.join(" ");
}

function normalizeRecommendation(
  value: unknown,
): AIPackageAnalysis["recommendation"] {
  const raw = typeof value === "string" ? value.toLowerCase().trim() : "";
  if (
    raw === "do-not-use" ||
    raw === "do not use" ||
    raw === "dont-use" ||
    raw === "don't-use"
  ) {
    return "do-not-use";
  }
  if (raw === "not-recommended" || raw === "not recommended") {
    return "not-recommended";
  }
  if (raw === "use-with-caution" || raw === "use with caution") {
    return "use-with-caution";
  }
  if (raw === "recommended") {
    return "recommended";
  }
  return "use-with-caution";
}

/**
 * Force a hard negative recommendation when package is deprecated,
 * archived, or clearly unmaintained — do not trust the model alone.
 */
function applyHealthRecommendationOverrides(
  analysis: AIPackageAnalysis,
  flags: PackageHealthFlags,
): AIPackageAnalysis {
  const shouldBlock =
    flags.deprecated || flags.archived || flags.unmaintained;
  if (!shouldBlock) {
    if (analysis.recommendation === "not-recommended") {
      return { ...analysis, recommendation: "do-not-use" };
    }
    return analysis;
  }

  const concerns = dedupeConcerns([
    ...flags.reasons,
    ...analysis.concerns,
  ]).slice(0, 5);

  return {
    ...analysis,
    recommendation: "do-not-use",
    maintenanceRating: "poor",
    overallScore: Math.min(analysis.overallScore, flags.deprecated || flags.archived ? 25 : 35),
    concerns: concerns.length > 0 ? concerns : ["Package appears unsafe to adopt for new work."],
    reasoning: mergeReasoning(
      ["Do not use this package for new projects", ...flags.reasons],
      analysis.reasoning || "",
    ),
  };
}

type BundleSizeLevel = "ok" | "notable" | "large" | "very-large";

function assessBundleSize(data: PackageAnalysisResult): {
  level: BundleSizeLevel | null;
  note: string | null;
  gzip: number | null;
  size: number | null;
} {
  const size = data.bundleSize?.size;
  const gzip = data.bundleSize?.gzip;
  if (
    size === undefined ||
    gzip === undefined ||
    !Number.isFinite(size) ||
    !Number.isFinite(gzip)
  ) {
    return { level: null, note: null, gzip: null, size: null };
  }

  if (gzip >= 200_000 || size >= 500_000) {
    return {
      level: "very-large",
      note: `Very large browser bundle (${formatBytes(gzip)} gzip / ${formatBytes(size)} minified) — likely to hurt client-side load performance.`,
      gzip,
      size,
    };
  }
  if (gzip >= 100_000 || size >= 250_000) {
    return {
      level: "large",
      note: `Large browser bundle (${formatBytes(gzip)} gzip / ${formatBytes(size)} minified) — may affect page load performance in the browser.`,
      gzip,
      size,
    };
  }
  if (gzip >= 50_000) {
    return {
      level: "notable",
      note: `Notable browser bundle size (${formatBytes(gzip)} gzip / ${formatBytes(size)} minified).`,
      gzip,
      size,
    };
  }
  return {
    level: "ok",
    note: null,
    gzip,
    size,
  };
}

/**
 * Ensure large/very-large bundles are called out in AI concerns.
 */
function applyBundleSizeNotes(
  analysis: AIPackageAnalysis,
  data: PackageAnalysisResult,
): AIPackageAnalysis {
  const assessment = assessBundleSize(data);
  if (
    !assessment.note ||
    (assessment.level !== "large" && assessment.level !== "very-large")
  ) {
    return analysis;
  }

  const alreadyNoted = analysis.concerns.some((c) =>
    /bundle|gzip|minified|payload|bundlephobia/i.test(c),
  );
  if (alreadyNoted) {
    return analysis;
  }

  const concerns = analysis.concerns.filter(
    (c) => c && c.toLowerCase() !== "none",
  );
  return {
    ...analysis,
    concerns: [assessment.note, ...concerns].slice(0, 5),
    reasoning: mergeReasoning(
      [assessment.note],
      analysis.reasoning || "",
    ),
  };
}

function finalizeAiAnalysis(
  analysis: AIPackageAnalysis,
  data: PackageAnalysisResult,
): AIPackageAnalysis {
  const withHealth = applyHealthRecommendationOverrides(
    analysis,
    detectPackageHealthFlags(data),
  );
  const withBundle = applyBundleSizeNotes(withHealth, data);
  return {
    ...withBundle,
    concerns: dedupeConcerns(withBundle.concerns).slice(0, 5),
  };
}

/**
 * Initialize Gemini AI model
 */
function getAIModel(modelName: string = 'gemini-2.5-flash') {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use Gemini 2.5 Flash by default, fallback to Flash-Lite for higher rate limits
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Initialize Groq AI client (fallback option)
 */
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  return new Groq({ apiKey });
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? days : null;
}

function adoptionLevel(
  monthlyDownloads?: number,
  stars?: number,
  dependents?: number
): 'widely-adopted' | 'moderate' | 'niche' {
  if (
    (monthlyDownloads ?? 0) >= 1_000_000 ||
    (stars ?? 0) >= 5_000 ||
    (dependents ?? 0) >= 1_000
  ) {
    return 'widely-adopted';
  }
  if (
    (monthlyDownloads ?? 0) >= 50_000 ||
    (stars ?? 0) >= 200 ||
    (dependents ?? 0) >= 50
  ) {
    return 'moderate';
  }
  return 'niche';
}

function maintenanceContext(
  daysSincePublish: number | null,
  daysSinceCommit: number | null,
  adoption: ReturnType<typeof adoptionLevel>
): string {
  const publish = daysSincePublish;
  const commit = daysSinceCommit;
  const popular = adoption === 'widely-adopted';

  if (publish === null) {
    return 'unknown — no publish date; do not infer abandonment from missing data';
  }
  if (publish < 90) {
    return `healthy (${publish} days since last publish). A gap of weeks or a few months is a normal release cadence. Do not call this stale. Do not use it to justify use-with-caution.`;
  }
  if (publish < 180) {
    if (popular) {
      return `normal for a mature, widely used package (${publish} days). This is not stale. Recommendation must not drop to use-with-caution on cadence alone.`;
    }
    return `acceptable (${publish} days). Not stale. Only mention as a mild note if there are other real risks.`;
  }
  if (publish < 365) {
    if (popular && (commit === null || commit < 180)) {
      return `mature/stable (${publish} days since publish). Widely adopted packages often go months between releases. Treat as maintained unless README says otherwise.`;
    }
    return `slow (${publish} days). May note slower releases, but use-with-caution only if there are also vulnerabilities, deprecation, or no commits.`;
  }
  if (popular && commit !== null && commit < 90) {
    return `long gap since npm publish (${publish} days) but recent git activity. For a widely adopted package this is often a stable major version, not abandonment.`;
  }
  if (publish >= 365 && (commit === null || commit >= 180) && !popular) {
    return `likely unmaintained (${publish} days since publish). This can justify use-with-caution or not-recommended.`;
  }
  return `long gap since last publish (${publish} days). Weigh adoption and security: a popular, vulnerability-free package may still be recommended with a maintenance note.`;
}

/**
 * Create a prompt for package analysis
 */
function createAnalysisPrompt(data: PackageAnalysisResult): string {
  const { packageName, npm, downloads, github, security, readme, popularity, bundleSize } = data;

  const lastPublished =
    npm?.time && npm.version ? npm.time[npm.version] : null;
  const daysSincePublish = daysSince(lastPublished);
  const daysSinceCommit = daysSince(github?.pushed_at);
  const monthlyDownloads = downloads?.downloads;
  const adoption = adoptionLevel(
    monthlyDownloads,
    github?.stars,
    popularity?.dependents,
  );
  const cadenceNote = maintenanceContext(
    daysSincePublish,
    daysSinceCommit,
    adoption,
  );

  let prompt = `Analyse this npm package and provide a detailed assessment:\n\n`;
  
  // Package basics
  prompt += `Package: ${packageName}\n`;
  prompt += `Version: ${npm?.version || 'Unknown'}\n`;
  prompt += `License: ${npm?.license || 'Unknown'}\n`;
  prompt += `Description: ${npm?.description || 'No description'}\n`;
  if (npm?.deprecated) {
    prompt += `⚠️ npm DEPRECATED: ${npm.deprecated}\n`;
  }
  if (github?.archived) {
    prompt += `⚠️ GitHub repository is ARCHIVED\n`;
  }
  if (npm?.keywords?.length) {
    prompt += `Keywords: ${npm.keywords.slice(0, 12).join(', ')}\n`;
  }
  prompt += `npm URL: https://www.npmjs.com/package/${packageName}\n`;

  if (daysSincePublish !== null && daysSincePublish >= 0) {
    prompt += `Days Since Last Publish: ${daysSincePublish}\n`;
  } else if (daysSincePublish !== null && daysSincePublish < 0) {
    prompt += `Package recently published (within the last day)\n`;
  }
  prompt += `\n`;

  prompt += `Adoption:\n`;
  prompt += `- Level: ${adoption}\n`;
  if (monthlyDownloads !== undefined) {
    prompt += `- Downloads (last month): ${monthlyDownloads.toLocaleString()}\n`;
  }
  if (popularity?.dependents !== undefined) {
    prompt += `- npm dependents: ${popularity.dependents.toLocaleString()}\n`;
  }
  if (popularity) {
    prompt += `- npm popularity score: ${popularity.popularityScore}\n`;
    prompt += `- npm quality score: ${popularity.qualityScore}\n`;
    prompt += `- npm maintenance score: ${popularity.maintenanceScore}\n`;
  }
  prompt += `\n`;

  // GitHub stats
  if (github) {
    prompt += `GitHub Statistics:\n`;
    prompt += `- Stars: ${github.stars.toLocaleString()}\n`;
    prompt += `- Forks: ${github.forks.toLocaleString()}\n`;
    prompt += `- Open Issues: ${github.open_issues.toLocaleString()}\n`;

    if (daysSinceCommit !== null && daysSinceCommit >= 0) {
      prompt += `- Days Since Last Commit: ${daysSinceCommit}\n`;
    } else if (daysSinceCommit !== null && daysSinceCommit < 0) {
      prompt += `- Recently committed (within the last day)\n`;
    }
    
    prompt += `- Language: ${github.language || 'Unknown'}\n\n`;
  }

  prompt += `Maintenance interpretation (authoritative — follow this):\n${cadenceNote}\n\n`;

  // Security vulnerabilities
  if (security) {
    prompt += `Security Assessment:\n`;
    prompt += `- Total Vulnerabilities: ${security.totalCount}\n`;
    prompt += `- Critical: ${security.critical}\n`;
    prompt += `- High: ${security.high}\n`;
    prompt += `- Moderate: ${security.moderate}\n`;
    prompt += `- Low: ${security.low}\n\n`;
  }

  const bundleAssessment = assessBundleSize(data);
  if (bundleSize && bundleAssessment.gzip !== null && bundleAssessment.size !== null) {
    prompt += `Browser bundle size (Bundlephobia):\n`;
    prompt += `- Minified: ${formatBytes(bundleAssessment.size)} (${bundleAssessment.size} bytes)\n`;
    prompt += `- Gzip: ${formatBytes(bundleAssessment.gzip)} (${bundleAssessment.gzip} bytes)\n`;
    prompt += `- Size rating: ${bundleAssessment.level}\n`;
    if (bundleAssessment.level === "large" || bundleAssessment.level === "very-large") {
      prompt += `⚠️ This bundle is ${bundleAssessment.level.replace("-", " ")}. You MUST mention it in concerns and weigh it in reasoning for client-side use. Do not treat a large gzip payload as a strength.\n`;
    } else if (bundleAssessment.level === "notable") {
      prompt += `Optional: briefly note the non-trivial bundle size if relevant to the use case.\n`;
    } else {
      prompt += `Bundle size is modest — may list as a strength for front-end use if relevant.\n`;
    }
    prompt += `\n`;
  }

  // README content (first 3000 chars - most important section)
  if (readme) {
    prompt += `README Content (first 3000 characters):\n`;
    prompt += `${readme}\n\n`;
    prompt += `⚠️ CRITICAL: Check the README above for:\n`;
    prompt += `- What the package is, who it is for, and how it is typically used\n`;
    prompt += `- Deprecation notices (e.g. "no longer maintained", "deprecated", "unmaintained")\n`;
    prompt += `- Migration warnings (e.g. "please use X instead", "consider switching to Y")\n`;
    prompt += `- Abandonment notices (e.g. "this project is archived", "not actively developed")\n`;
    prompt += `- Security warnings or end-of-life announcements\n`;
    prompt += `If ANY of these are present, recommendation MUST be "do-not-use".\n\n`;
  }

  const healthFlags = detectPackageHealthFlags(data);
  if (healthFlags.deprecated || healthFlags.archived || healthFlags.unmaintained) {
    prompt += `⚠️ HARD RULE — package health flags already detected:\n`;
    for (const reason of healthFlags.reasons) {
      prompt += `- ${reason}\n`;
    }
    prompt += `You MUST set recommendation to "do-not-use", maintenanceRating to "poor", and include these reasons in concerns.\n\n`;
  }

  prompt += `RECOMMENDATION RULES:\n`;
  prompt += `- Weigh security, adoption, quality, and true abandonment — not how recently a popular package happened to publish.\n`;
  prompt += `- Fewer than 90 days since last publish is healthy. Never call it stale. Never choose use-with-caution for that reason.\n`;
  prompt += `- Widely adopted packages (React, lodash, TypeScript, and similar) often go weeks or months between releases. That is expected for a stable major version.\n`;
  prompt += `- use-with-caution requires a concrete risk: unpatched high/critical vulnerabilities, likely malware/typosquat, or a niche package with worrying signals that are not yet full abandonment.\n`;
  prompt += `- do-not-use (preferred) or not-recommended: npm-deprecated packages, archived repos, README deprecation/migration notices, or clearly unmaintained packages. Say the package should not be used for new work.\n`;
  prompt += `- A large or very-large browser bundle (see Bundlephobia section) must appear in concerns when the package is meant for front-end/browser use.\n`;
  prompt += `- High open-issue counts on huge repos are not a red flag by themselves (they often include PRs or a large backlog).\n`;
  prompt += `- Do not pad concerns with release-cadence commentary when cadence is healthy. Use ["None"] if there are no real concerns.\n`;
  prompt += `- Maintenance rating: excellent if published within ~90 days or widely adopted with recent commits; good up to ~6 months (or longer if widely adopted and secure); fair/poor only for genuine inactivity.\n\n`;
  
  prompt += `Based on this data, provide:\n`;
  prompt += `1. A summary (3-4 sentences) that explains the package itself, not a scorecard.\n`;
  prompt += `   Sentence 1: what it is (library, CLI, plugin, framework) and the problem it solves.\n`;
  prompt += `   Sentence 2: who it is for and how you would use it (e.g. import React icon components, tree-shake icons in a UI).\n`;
  prompt += `   Remaining sentences: notable capabilities or how it fits the ecosystem. Draw this from the description, keywords, and README.\n`;
  prompt += `   Do not lead with popularity, download counts, "zero vulnerabilities", npm scores, or how recently it was published. Those belong in strengths, scores, or reasoning.\n`;
  prompt += `   Only mention staleness or abandonment if the maintenance interpretation above says so.\n`;
  prompt += `2. Overall recommendation: "recommended", "use-with-caution", "not-recommended", or "do-not-use"\n`;
  prompt += `3. Key strengths (array of 3-5 strings)\n`;
  prompt += `4. Any concerns (array of 2-4 strings, or ["None"] if no real concerns)\n`;
  prompt += `5. Overall score (0-100). Do not deduct points for a normal release cadence on a widely adopted package.\n`;
  prompt += `6. Security rating: "excellent", "good", "fair", or "poor"\n`;
  prompt += `7. Quality rating: "excellent", "good", "fair", or "poor"\n`;
  prompt += `8. Maintenance rating: "excellent", "good", "fair", or "poor"\n`;
  prompt += `9. Reasoning for your recommendation (2-3 sentences)\n\n`;
  prompt += `Respond ONLY with valid JSON in this exact format:\n`;
  prompt += `{\n`;
  prompt += `  "summary": "string",\n`;
  prompt += `  "recommendation": "recommended|use-with-caution|not-recommended|do-not-use",\n`;
  prompt += `  "strengths": ["string1", "string2", "string3"],\n`;
  prompt += `  "concerns": ["string1", "string2"],\n`;
  prompt += `  "overallScore": number,\n`;
  prompt += `  "securityRating": "excellent|good|fair|poor",\n`;
  prompt += `  "qualityRating": "excellent|good|fair|poor",\n`;
  prompt += `  "maintenanceRating": "excellent|good|fair|poor",\n`;
  prompt += `  "reasoning": "string"\n`;
  prompt += `}\n\n`;
  prompt += `Do not include any text outside the JSON object. Use normal ASCII spaces and hyphens (e.g. "well-maintained"), never join words.`;

  return prompt;
}

function normalizeAiPunctuation(text: string): string {
  return text
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s*[\u2013\u2014\u2015]\s*/g, ' - ')
    .replace(/[\u2010\u2011\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/ {2,}/g, ' ');
}

function normalizeAiString(value: unknown): string {
  return typeof value === 'string' ? normalizeAiPunctuation(value).trim() : '';
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(response: string): AIPackageAnalysis {
  try {
    // Remove markdown code blocks if present
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON from the response
    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    let jsonString = jsonMatch[0];
    
    // Clean up common JSON issues from AI responses
    jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1');
    jsonString = normalizeAiPunctuation(jsonString);
    
    const parsed = JSON.parse(jsonString);
    
    const strengths = Array.isArray(parsed.strengths) 
      ? parsed.strengths
          .map((s: unknown) => normalizeAiString(s))
          .filter(Boolean)
      : (parsed.strengths
        ? [normalizeAiString(parsed.strengths)].filter(Boolean)
        : []);
    
    const concerns = Array.isArray(parsed.concerns) 
      ? parsed.concerns
          .map((c: unknown) => normalizeAiString(c))
          .filter(Boolean)
      : (parsed.concerns
        ? [normalizeAiString(parsed.concerns)].filter(Boolean)
        : []);

    return {
      summary: normalizeAiString(parsed.summary),
      recommendation: normalizeRecommendation(parsed.recommendation),
      strengths: strengths.length > 0 ? strengths : ['Unable to identify specific strengths from data'],
      concerns: concerns.length > 0 ? concerns : ['Unable to identify specific concerns from data'],
      overallScore: Number(parsed.overallScore) || 50,
      securityRating: parsed.securityRating || 'fair',
      qualityRating: parsed.qualityRating || 'fair',
      maintenanceRating: parsed.maintenanceRating || 'fair',
      reasoning: normalizeAiString(parsed.reasoning) || normalizeAiString(parsed.summary) || 'Analysis based on package metrics',
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response was:', response);
    // Return a safe default
    return {
      summary: 'Unable to generate AI analysis at this time.',
      recommendation: 'use-with-caution',
      strengths: ['Package data available for manual review'],
      concerns: ['AI analysis temporarily unavailable'],
      overallScore: 50,
      securityRating: 'fair',
      qualityRating: 'fair',
      maintenanceRating: 'fair',
      reasoning: 'Please review the package metrics manually.',
    };
  }
}

/**
 * Analyze a package using AI with automatic fallback to Flash-Lite on rate limit
 */
export async function analyzePackageWithAI(
  data: PackageAnalysisResult
): Promise<AIPackageAnalysis> {
  const prompt = createAnalysisPrompt(data);

  const systemPrompt = 'You are an expert software engineer helping another developer decide whether to use an npm package. ' +
    'The summary must explain what the package is and what it is for, using the description and README, before any quality judgement. ' +
    'Do not write a metrics recap in the summary (downloads, stars, "zero vulnerabilities", publish recency). ' +
    'A few weeks or months since the last npm publish is normal for widely used libraries and is not a reason to recommend caution. ' +
    'Provide honest, balanced assessments. Always respond in valid JSON format.';

  const fullPrompt = `${systemPrompt}\n\n${prompt}`;

  // Try Gemini 2.5 Flash first
  try {
    console.log('Attempting analysis with Gemini 2.5 Flash...');
    const model = getAIModel('gemini-2.5-flash');
    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();
    
    const aiAnalysis = parseAIResponse(text);
    aiAnalysis.model = 'Gemini 2.5 Flash';
    console.log('✓ Analysis completed with Gemini 2.5 Flash');
    return finalizeAiAnalysis(aiAnalysis, data);
  } catch (error: any) {
    // Check if it's a rate limit error (429)
    const isRateLimitError = error.message?.includes('429') || 
                             error.message?.includes('quota') || 
                             error.message?.includes('rate limit');
    
    if (isRateLimitError) {
      console.warn('⚠ Rate limit hit on Flash, falling back to Flash-Lite...');
      
      // Fallback to Gemini 2.5 Flash-Lite
      try {
        const fallbackModel = getAIModel('gemini-2.5-flash-lite');
        const result = await fallbackModel.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();
        
        const aiAnalysis = parseAIResponse(text);
        aiAnalysis.model = 'Gemini 2.5 Flash Lite';
        console.log('✓ Analysis completed with Gemini 2.5 Flash-Lite');
        return finalizeAiAnalysis(aiAnalysis, data);
      } catch (flashLiteError: any) {
        const isFlashLiteRateLimit = flashLiteError.message?.includes('429') || 
                                      flashLiteError.message?.includes('quota') || 
                                      flashLiteError.message?.includes('rate limit');
        
        if (isFlashLiteRateLimit) {
          console.warn('⚠ Flash-Lite also rate limited, falling back to Groq...');
          
          // Final fallback to Groq (14,400 requests/day)
          try {
            const groqClient = getGroqClient();
            const chatCompletion = await groqClient.chat.completions.create({
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              model: GROQ_MODEL,
              temperature: 0.7,
              max_tokens: 2048,
            });
            
            const text = chatCompletion.choices[0]?.message?.content || '';
            const aiAnalysis = parseAIResponse(text);
            aiAnalysis.model = GROQ_MODEL_LABEL;
            console.log(`✓ Analysis completed with Groq (${GROQ_MODEL_LABEL})`);
            return finalizeAiAnalysis(aiAnalysis, data);
          } catch (groqError: any) {
            console.error('Groq also failed:', groqError);
            throw new Error(`Failed to analyze package with AI (all providers): ${groqError.message}`);
          }
        } else {
          console.error('Flash-Lite failed (non-rate-limit):', flashLiteError);
          throw new Error(`Failed to analyze package with AI: ${flashLiteError.message}`);
        }
      }
    } else {
      // Non-rate-limit error, throw immediately
      console.error('AI analysis failed:', error);
      throw new Error(`Failed to analyze package with AI: ${error.message}`);
    }
  }
}

/**
 * Generate a quick summary for a package with fallback
 */
export async function generatePackageSummary(
  packageName: string,
  version: string,
  license: string,
  npmUrl: string,
  score: number
): Promise<string> {
  const prompt = `Package: ${packageName}
Version: ${version}
License: ${license}
URL: ${npmUrl}
Quality Score: ${score}/100

Generate a single concise sentence (max 20 words) summarizing if this package is good to use.`;

  // Try Flash first, fallback to Flash-Lite
  try {
    const model = getAIModel('gemini-2.5-flash');
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error: any) {
    const isRateLimitError = error.message?.includes('429') || 
                             error.message?.includes('quota') || 
                             error.message?.includes('rate limit');
    
    if (isRateLimitError) {
      try {
        const fallbackModel = getAIModel('gemini-2.5-flash-lite');
        const result = await fallbackModel.generateContent(prompt);
        const response = result.response;
        return response.text();
      } catch (flashLiteError: any) {
        const isFlashLiteRateLimit = flashLiteError.message?.includes('429') || 
                                      flashLiteError.message?.includes('quota') || 
                                      flashLiteError.message?.includes('rate limit');
        
        if (isFlashLiteRateLimit) {
          try {
            const groqClient = getGroqClient();
            const chatCompletion = await groqClient.chat.completions.create({
              messages: [{ role: 'user', content: prompt }],
              model: GROQ_MODEL,
              temperature: 0.7,
              max_tokens: 256,
            });
            return chatCompletion.choices[0]?.message?.content || `${packageName} v${version} - Quality score: ${score}/100`;
          } catch {
            return `${packageName} v${version} - Quality score: ${score}/100`;
          }
        }
        return `${packageName} v${version} - Quality score: ${score}/100`;
      }
    }
    return `${packageName} v${version} - Quality score: ${score}/100`;
  }
}
