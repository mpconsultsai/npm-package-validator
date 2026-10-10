import { describe, it } from "vitest";
import { formatNugetDescription, dotnetApiReferenceUrl } from "@/lib/nuget-description";

describe("dotnetApiReferenceUrl", () => {
  it("should link a type to learn.microsoft.com", () => {
    dotnetApiReferenceUrl("System.Text.Json.JsonSerializer").should.equal(
      "https://learn.microsoft.com/dotnet/api/system.text.json.jsonserializer",
    );
  });

  it("should include generic arity", () => {
    dotnetApiReferenceUrl("System.Collections.Generic.List<T>").should.equal(
      "https://learn.microsoft.com/dotnet/api/system.collections.generic.list-1",
    );
  });

  it("should be null for a name that is not a dotted type", () => {
    (dotnetApiReferenceUrl("JsonSerializer") === null).should.be.true;
  });
});

describe("formatNugetDescription", () => {
  it("should be empty for a missing description", () => {
    formatNugetDescription(null).should.deep.equal({
      description: "",
      commonlyUsedTypes: [],
      note: null,
    });
    formatNugetDescription("   ").description.should.equal("");
  });

  it("should collapse prose when there is no type list", () => {
    formatNugetDescription("Hello\n\nworld <b>there</b>").description.should.equal(
      "Hello world there",
    );
  });

  it("should split commonly used types and keep a trailing note", () => {
    const formatted = formatNugetDescription(
      "JSON for .NET\n\nCommonly Used Types:\nSystem.Text.Json.JsonSerializer\nSystem.Collections.Generic.List<T>\nRequires NuGet 2.12 or higher.",
    );
    formatted.description.should.equal("JSON for .NET");
    formatted.commonlyUsedTypes.should.deep.equal([
      "System.Text.Json.JsonSerializer",
      "System.Collections.Generic.List<T>",
    ]);
    formatted.note!.should.match(/Requires NuGet 2.12/);
  });
});
