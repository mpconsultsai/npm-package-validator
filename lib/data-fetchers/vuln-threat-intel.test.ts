import { describe, it } from "vitest";
import { extractCveIds } from "@/lib/data-fetchers/vuln-threat-intel";

describe("extractCveIds", () => {
  it("should return unique uppercase CVE ids", () => {
    extractCveIds(
      "See cve-2024-1234 and CVE-2024-1234 plus CVE-2021-44228.",
    ).should.deep.equal(["CVE-2024-1234", "CVE-2021-44228"]);
  });

  it("should be empty when there is no CVE", () => {
    extractCveIds("nothing here").should.deep.equal([]);
  });
});
