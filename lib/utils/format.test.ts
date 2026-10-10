import { describe, it } from "vitest";
import {
  formatBytes,
  formatCompactNumber,
  formatDaysSinceRelease,
  formatPublishDate,
} from "@/lib/utils/format";

describe("formatCompactNumber", () => {
  it("should use a compact English form", () => {
    formatCompactNumber(1500).should.match(/1\.5K/i);
  });
});

describe("formatDaysSinceRelease", () => {
  it("should be Unknown for a non-finite value", () => {
    formatDaysSinceRelease(Number.NaN).should.equal("Unknown");
  });

  it("should describe days and years", () => {
    formatDaysSinceRelease(0).should.equal("0 days ago");
    formatDaysSinceRelease(1.9).should.equal("1 day ago");
    formatDaysSinceRelease(365).should.equal("Over 1 year");
    formatDaysSinceRelease(800).should.equal("Over 2 years");
  });
});

describe("formatPublishDate", () => {
  it("should be null for a missing or invalid date", () => {
    (formatPublishDate(null) === null).should.be.true;
    (formatPublishDate("not-a-date") === null).should.be.true;
  });

  it("should use a short UK date", () => {
    formatPublishDate("2026-09-09T12:00:00.000Z")!.should.match(/^9 \w+ 2026$/);
  });
});

describe("formatBytes", () => {
  it("should be a dash for a negative or non-finite size", () => {
    formatBytes(-1).should.equal("-");
    formatBytes(Number.NaN).should.equal("-");
  });

  it("should use bytes, kilobytes, and megabytes", () => {
    formatBytes(500).should.equal("500 B");
    formatBytes(1500).should.equal("1.5 kB");
    formatBytes(15_000).should.equal("15 kB");
    formatBytes(2_500_000).should.equal("2.50 MB");
    formatBytes(12_000_000).should.equal("12.0 MB");
  });
});
