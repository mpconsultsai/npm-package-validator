import { describe, it } from "vitest";
import { snykPackageUrl } from "@/lib/utils/advisory-links";

describe("snykPackageUrl", () => {
  it("should encode a scoped name as one path segment", () => {
    snykPackageUrl("@angular/core", "19.0.0").should.equal(
      "https://security.snyk.io/package/npm/%40angular%2Fcore/19.0.0",
    );
  });

  it("should omit the version when it is absent", () => {
    snykPackageUrl("lodash").should.equal(
      "https://security.snyk.io/package/npm/lodash",
    );
  });
});
