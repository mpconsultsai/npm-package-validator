import { describe, it } from "vitest";
import {
  buildAllDependencyPathsFromRoot,
  buildDependencyPathsFromRoot,
  packageNameFromDepNodeId,
} from "@/lib/utils/dependency-paths";

describe("packageNameFromDepNodeId", () => {
  it("should drop the version, including for a scoped package", () => {
    packageNameFromDepNodeId("@scope/pkg@1.2.3").should.equal("@scope/pkg");
    packageNameFromDepNodeId("lodash").should.equal("lodash");
  });
});

describe("buildDependencyPathsFromRoot", () => {
  it("should record the shortest path to each node", () => {
    const paths = buildDependencyPathsFromRoot("app@1.0.0", [
      { from: "app@1.0.0", to: "left@1.0.0" },
      { from: "app@1.0.0", to: "right@1.0.0" },
      { from: "left@1.0.0", to: "shared@1.0.0" },
      { from: "right@1.0.0", to: "shared@1.0.0" },
    ]);
    paths.get("shared@1.0.0")!.should.deep.equal(["app", "left", "shared"]);
  });
});

describe("buildAllDependencyPathsFromRoot", () => {
  it("should list simple paths shortest first and cap them", () => {
    const paths = buildAllDependencyPathsFromRoot("root@1", [
      { from: "root@1", to: "a@1" },
      { from: "root@1", to: "b@1" },
      { from: "a@1", to: "leaf@1" },
      { from: "b@1", to: "leaf@1" },
      { from: "leaf@1", to: "a@1" },
    ]);
    paths.get("leaf@1")!.should.deep.equal([
      ["root", "a", "leaf"],
      ["root", "b", "leaf"],
    ]);

    const capped = buildAllDependencyPathsFromRoot(
      "root@1",
      [
        { from: "root@1", to: "a@1" },
        { from: "a@1", to: "b@1" },
      ],
      { maxPathsPerNode: 1, maxDepth: 0 },
    );
    capped.get("root@1")!.should.have.lengthOf(1);
    capped.has("a@1").should.be.false;
  });
});
