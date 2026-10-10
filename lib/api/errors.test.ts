import { describe, it } from "vitest";
import {
  AppError,
  messageFromUnknownError,
  statusFromUnknownError,
} from "@/lib/api/errors";

describe("AppError", () => {
  it("should default to status 400", () => {
    const error = new AppError("Bad request");
    error.should.be.instanceOf(Error);
    error.name.should.equal("AppError");
    error.status.should.equal(400);
    error.message.should.equal("Bad request");
  });
});

describe("statusFromUnknownError", () => {
  it("should keep an AppError status", () => {
    statusFromUnknownError(new AppError("missing", 404)).should.equal(404);
  });

  it("should map not found and missing configuration", () => {
    statusFromUnknownError(new Error("Package not found")).should.equal(404);
    statusFromUnknownError(new Error("GROQ_API_KEY is not configured")).should.equal(
      503,
    );
    statusFromUnknownError("not found").should.equal(404);
  });

  it("should fall back to 500", () => {
    statusFromUnknownError(new Error("boom")).should.equal(500);
    statusFromUnknownError(null).should.equal(500);
  });
});

describe("messageFromUnknownError", () => {
  it("should use the error message", () => {
    messageFromUnknownError(new Error("nope")).should.equal("nope");
  });

  it("should fall back when the message is empty", () => {
    messageFromUnknownError(new Error(""), "Request failed").should.equal(
      "Request failed",
    );
    messageFromUnknownError("nope").should.equal("Request failed");
  });
});
