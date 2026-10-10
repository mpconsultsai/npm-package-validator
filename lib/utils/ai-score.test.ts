import { describe, it } from "vitest";
import {
  aiScoreBarClass,
  aiScoreTextClass,
  isHighQualityAiScore,
  ratingTextClass,
  recommendationBadgeClass,
  recommendationLabel,
} from "@/lib/utils/ai-score";

describe("ai score colours", () => {
  it("should be red below 20", () => {
    aiScoreTextClass(0).should.match(/text-red-600/);
    aiScoreBarClass(19).should.equal("bg-red-500");
  });

  it("should be orange below 50", () => {
    aiScoreTextClass(20).should.match(/text-orange-600/);
    aiScoreBarClass(49).should.equal("bg-orange-500");
  });

  it("should be amber below 70", () => {
    aiScoreTextClass(50).should.match(/text-amber-600/);
    aiScoreBarClass(69).should.equal("bg-amber-500");
  });

  it("should be blue below 90", () => {
    aiScoreTextClass(70).should.match(/text-blue-600/);
    aiScoreBarClass(89).should.equal("bg-blue-500");
  });

  it("should be emerald from 90", () => {
    aiScoreTextClass(90).should.match(/text-emerald-600/);
    aiScoreBarClass(100).should.equal("bg-emerald-500");
    isHighQualityAiScore(90).should.be.true;
    isHighQualityAiScore(89).should.be.false;
  });
});

describe("recommendationLabel", () => {
  it("should be Do not use for do-not-use and not-recommended", () => {
    recommendationLabel("do-not-use").should.equal("Do not use");
    recommendationLabel("not-recommended").should.equal("Do not use");
  });

  it("should be Use with caution", () => {
    recommendationLabel(" use-with-caution ").should.equal("Use with caution");
  });

  it("should be Recommended", () => {
    recommendationLabel("recommended").should.equal("Recommended");
  });

  it("should replace hyphens when the value is unrecognised", () => {
    recommendationLabel("Needs-Review").should.equal("Needs Review");
  });
});

describe("rating and badge classes", () => {
  it("should colour excellent, good, fair, and poor ratings", () => {
    ratingTextClass("Excellent").should.match(/emerald/);
    ratingTextClass("good").should.match(/blue/);
    ratingTextClass("fair").should.match(/amber/);
    ratingTextClass("poor").should.match(/red/);
  });

  it("should use an emerald badge for recommended", () => {
    recommendationBadgeClass("recommended").should.match(/emerald/);
  });

  it("should use an amber badge for use-with-caution", () => {
    recommendationBadgeClass("use-with-caution").should.match(/amber/);
  });

  it("should use a red badge for do-not-use", () => {
    recommendationBadgeClass("do-not-use").should.match(/red/);
  });
});
