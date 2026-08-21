import { describe, expect, it } from "vitest";
import { createCoordinatedDeck, type SlideDescriptor } from "../src/lib/scheduler";

function slide(id: string, kind: SlideDescriptor["kind"] = "photo"): SlideDescriptor {
  return { id, moduleId: "test", kind, durationMs: 1_000, payload: {} };
}

describe("coordinated scheduler", () => {
  const slides = [slide("a"), slide("b"), slide("c"), slide("message", "text"), slide("clock", "clock")];

  it("is deterministic for a session seed", () => {
    expect(createCoordinatedDeck(slides, "session-1", 0)).toEqual(createCoordinatedDeck(slides, "session-1", 0));
  });

  it("offsets different displays", () => {
    const first = createCoordinatedDeck(slides, "session-1", 0);
    const second = createCoordinatedDeck(slides, "session-1", 1);
    expect(first[0].id).not.toBe(second[0].id);
    expect(new Set(first.map((item) => item.id))).toEqual(new Set(second.map((item) => item.id)));
  });
});
