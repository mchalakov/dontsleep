import { describe, expect, it } from "vitest";
import { toStarterMedia, validateStarterMediaSources } from "../src/content/starter-media";
import type { StarterMediaSource } from "../src/types/media";

const approved: StarterMediaSource = {
  id: "approved-logo",
  sourceFile: "company-logo.svg",
  description: "Company logo",
  kind: "logo"
};

describe("starter media catalog", () => {
  it("builds stable offline asset URLs", () => {
    expect(toStarterMedia(approved).src).toBe("/starter/approved-logo.svg");
    expect(toStarterMedia({ ...approved, id: "office", sourceFile: "office.jpg", kind: "photo" }).src).toBe("/starter/office.webp");
  });

  it("rejects duplicates and missing descriptions", () => {
    expect(() => validateStarterMediaSources([approved, approved])).toThrow(/Duplicate/);
    expect(() => validateStarterMediaSources([{ ...approved, description: "" }])).toThrow(/description/);
  });
});
