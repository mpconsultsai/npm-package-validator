import { describe, it } from "vitest";
import {
  getGroqModel,
  getGroqUpgradeAgentModel,
  groqModelLabel,
} from "@/lib/ai/groq-config";

describe("groqModelLabel", () => {
  it("should pretty-print a model id", () => {
    groqModelLabel("openai/gpt-oss-20b").should.equal("GPT OSS 20b (Groq)");
    groqModelLabel("llama-3").should.equal("Llama 3 (Groq)");
  });
});

describe("getGroqModel", () => {
  it("should require the model env vars", () => {
    const model = process.env.GROQ_MODEL;
    const agent = process.env.GROQ_UPGRADE_AGENT_MODEL;
    delete process.env.GROQ_MODEL;
    delete process.env.GROQ_UPGRADE_AGENT_MODEL;
    const missingModel = () => getGroqModel();
    missingModel.should.throw(/GROQ_MODEL is not configured/);
    const missingAgent = () => getGroqUpgradeAgentModel();
    missingAgent.should.throw(/GROQ_UPGRADE_AGENT_MODEL is not configured/);
    process.env.GROQ_MODEL = "llama";
    process.env.GROQ_UPGRADE_AGENT_MODEL = "llama-agent";
    getGroqModel().should.equal("llama");
    getGroqUpgradeAgentModel().should.equal("llama-agent");
    if (model === undefined) delete process.env.GROQ_MODEL;
    else process.env.GROQ_MODEL = model;
    if (agent === undefined) delete process.env.GROQ_UPGRADE_AGENT_MODEL;
    else process.env.GROQ_UPGRADE_AGENT_MODEL = agent;
  });
});
