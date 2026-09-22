import {
  runUpgradeAgent,
  UPGRADE_AGENT_GENERIC_ERROR,
  isUpgradeAgentProviderError,
} from "@/lib/ai/upgrade-agent";
import { AppError } from "@/lib/api/errors";
import { jsonOk, withHandler } from "@/lib/api/http";
import {
  optionalPackageManager,
  readJsonBody,
  requireFromTo,
  requirePackageName,
} from "@/lib/api/params";

/** POST /api/v1/upgrade/agent */
export const POST = withHandler(
  async (request) => {
    const body = await readJsonBody(request);
    const packageName = requirePackageName(
      typeof body.packageName === "string"
        ? body.packageName
        : typeof body.package === "string"
          ? body.package
          : "",
    );
    const { from, to } = requireFromTo(
      typeof body.from === "string" ? body.from : "",
      typeof body.to === "string" ? body.to : "",
    );
    const packageManager = optionalPackageManager(body.packageManager);

    if (!process.env.GROQ_API_KEY?.trim()) {
      throw new AppError(UPGRADE_AGENT_GENERIC_ERROR, 503);
    }
    if (!process.env.GROQ_UPGRADE_AGENT_MODEL?.trim()) {
      throw new AppError(UPGRADE_AGENT_GENERIC_ERROR, 503);
    }

    try {
      const result = await runUpgradeAgent({
        packageName,
        from,
        to,
        packageManager,
      });

      return jsonOk({
        packageName,
        from,
        to,
        packageManager,
        ...result,
      });
    } catch (error: unknown) {
      // Log provider noise server-side only; clients get a generic message.
      console.error("upgrade/agent:", error);
      if (error instanceof AppError) {
        throw new AppError(UPGRADE_AGENT_GENERIC_ERROR, error.status);
      }
      if (isUpgradeAgentProviderError(error)) {
        throw new AppError(UPGRADE_AGENT_GENERIC_ERROR, 502);
      }
      throw new AppError(UPGRADE_AGENT_GENERIC_ERROR, 502);
    }
  },
  {
    logLabel: "upgrade/agent",
    fallbackMessage: UPGRADE_AGENT_GENERIC_ERROR,
  },
);
