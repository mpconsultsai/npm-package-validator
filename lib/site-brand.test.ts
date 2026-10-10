import { describe, it } from "vitest";
import { SITE_NAME, SITE_TITLE } from "@/lib/site-brand";

describe("site brand", () => {
  it("should name the product pkglens", () => {
    SITE_NAME.should.equal("pkglens");
    SITE_TITLE.should.match(/pkglens/);
  });
});
