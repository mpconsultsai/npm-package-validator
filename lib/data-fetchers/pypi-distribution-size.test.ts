import { describe, it } from "vitest";
import {
  distributionSizeCaption,
  pickPypiDistributionSize,
} from "@/lib/data-fetchers/pypi-distribution-size";

describe("pickPypiDistributionSize", () => {
  it("should be null without a version or usable files", () => {
    (pickPypiDistributionSize(undefined, "1.0.0") === null).should.be.true;
    (pickPypiDistributionSize({}, "Unknown") === null).should.be.true;
    (pickPypiDistributionSize({ "1.0.0": [{ yanked: true, size: 10 }] }, "1.0.0") ===
      null).should.be.true;
  });

  it("should prefer a universal wheel, then any wheel, then an sdist", () => {
    pickPypiDistributionSize(
      {
        "1.0.0": [
          { packagetype: "bdist_wheel", size: 20, filename: "a-cp39.whl" },
          {
            packagetype: "bdist_wheel",
            size: 10,
            filename: "a-py3-none-any.whl",
          },
        ],
      },
      "1.0.0",
    )!.filename!.should.equal("a-py3-none-any.whl");

    pickPypiDistributionSize(
      { "1.0.0": [{ packagetype: "sdist", size: 30, filename: "a.tar.gz" }] },
      "1.0.0",
    )!.packagetype.should.equal("sdist");

    pickPypiDistributionSize(
      { "1.0.0": [{ packagetype: "bdist_egg", size: 5, filename: "a.egg" }] },
      "1.0.0",
    )!.packagetype.should.equal("bdist_egg");
  });
});

describe("distributionSizeCaption", () => {
  it("should caption wheels, sdists, nupkgs, and other files", () => {
    distributionSizeCaption({
      bytes: 1,
      packagetype: "bdist_wheel",
      filename: "a.whl",
    }).title!.should.match(/wheel/i);
    distributionSizeCaption({ bytes: 1, packagetype: "bdist_wheel" }).fileLabel
      .should.match(/whl/);
    distributionSizeCaption({ bytes: 1, packagetype: "sdist" }).fileLabel.should.match(
      /tar\.gz/,
    );
    distributionSizeCaption({
      bytes: 1,
      packagetype: "nupkg",
      filename: "a.nupkg",
    }).title!.should.match(/NuGet/);
    distributionSizeCaption({ bytes: 1, packagetype: "unknown" }).fileLabel.should.match(
      /distribution/,
    );
  });
});
