/**
 * Groq model IDs — required env vars so retiring/renaming models is a config change.
 * See https://console.groq.com/docs/models and https://console.groq.com/docs/deprecations
 */

function requireEnvModel(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/** Display label derived from a model id (e.g. openai/gpt-oss-20b → GPT-OSS 20B (Groq)). */
export function groqModelLabel(modelId: string): string {
  const leaf = modelId.includes("/")
    ? modelId.slice(modelId.lastIndexOf("/") + 1)
    : modelId;
  const pretty = leaf
    .replace(/-/g, " ")
    .replace(/\boss\b/gi, "OSS")
    .replace(/\bgpt\b/gi, "GPT")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${pretty} (Groq)`;
}

/** Primary Groq chat model (AI analysis fallback). Requires GROQ_MODEL. */
export function getGroqModel(): string {
  return requireEnvModel("GROQ_MODEL");
}

/** Upgrade-agent synthesize model. Requires GROQ_UPGRADE_AGENT_MODEL. */
export function getGroqUpgradeAgentModel(): string {
  return requireEnvModel("GROQ_UPGRADE_AGENT_MODEL");
}
