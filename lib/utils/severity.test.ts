import { describe, it } from "vitest";
import {
  severityBadgeClass,
  severityBorderClass,
  sortBySeverity,
} from "@/lib/utils/severity";

describe("sortBySeverity", () => {
  it("should order critical, high, moderate, then unknown", () => {
    sortBySeverity([
      { severity: "low", id: "l" },
      { severity: "HIGH", id: "h" },
      { severity: "unknown", id: "u" },
      { severity: "critical", id: "c" },
      { severity: "medium", id: "m" },
    ]).map((item) => item.id).should.deep.equal(["c", "h", "m", "l", "u"]);
  });
});

describe("severity classes", () => {
  it("should colour critical, high, moderate, and low badges", () => {
    severityBadgeClass("critical").should.match(/purple/);
    severityBadgeClass("high").should.match(/red/);
    severityBadgeClass("moderate").should.match(/orange/);
    severityBadgeClass("medium").should.match(/orange/);
    severityBadgeClass("low").should.match(/yellow/);
  });

  it("should colour the matching borders", () => {
    severityBorderClass("critical").should.equal("border-purple-500");
    severityBorderClass("high").should.equal("border-red-500");
    severityBorderClass("moderate").should.equal("border-orange-500");
    severityBorderClass("info").should.equal("border-yellow-500");
  });
});
