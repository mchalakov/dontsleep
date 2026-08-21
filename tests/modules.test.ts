import { describe, expect, it } from "vitest";
import { slideModules, validateModuleRegistry } from "../src/modules/registry";

describe("module registry", () => {
  it("ships pictures, clock, and text modules", () => {
    expect(slideModules.map((module) => module.id)).toEqual(["photos", "clock", "text"]);
    expect(() => validateModuleRegistry()).not.toThrow();
  });

  it("rejects duplicate module ids", () => {
    expect(() => validateModuleRegistry([slideModules[0], { ...slideModules[1], id: slideModules[0].id }])).toThrow(/Duplicate/);
  });
});
