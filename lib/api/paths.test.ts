import { describe, it } from "vitest";
import { apiPaths } from "@/lib/api/paths";

describe("apiPaths", () => {
  it("should expose versioned API paths", () => {
    apiPaths.health.should.equal("/api/v1/health");
    apiPaths.analysis.metrics.should.match(/^\/api\/v1\//);
    apiPaths.packages.similar.should.match(/^\/api\/v1\//);
  });
});
