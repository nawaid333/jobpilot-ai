import { describe, expect, it } from "vitest";
import { safeHttpUrl, stringArrayField, stringField } from "./validate";

describe("API validation", () => {
  it("accepts bounded strings", () => expect(stringField("  hello ", 10, "name")).toBe("hello"));
  it("rejects non-strings", () => expect(() => stringField(123, 10, "name")).toThrow());
  it("rejects oversized strings", () => expect(() => stringField("123456", 5, "name")).toThrow());
  it("bounds arrays", () => expect(() => stringArrayField(["a", "b"], 1, 10, "items")).toThrow());
  it("accepts http and https URLs", () => {
    expect(safeHttpUrl("https://example.com/apply", "url")).toBe("https://example.com/apply");
  });
  it("rejects unsafe URL schemes", () => expect(() => safeHttpUrl("javascript:alert(1)", "url")).toThrow());
});
