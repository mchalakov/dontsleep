import { describe, expect, it } from "vitest";
import { textModule } from "../src/modules/text";
import { DEFAULT_SETTINGS } from "../src/types/media";

describe("Text plugin", () => {
  it("turns each saved message into moving display content", () => {
    const slides = textModule.buildSlides({
      settings: {
        ...DEFAULT_SETTINGS,
        textMessages: [
          { id: "one", text: "The remote build is running", createdAt: 1 },
          { id: "two", text: "Coffee break", createdAt: 2 }
        ]
      },
      personalPhotos: [],
      personalUrls: new Map()
    });

    expect(slides).toHaveLength(2);
    expect(slides.map((slide) => slide.kind)).toEqual(["text", "text"]);
    expect(slides.map((slide) => (slide.payload as { text: string }).text)).toEqual([
      "The remote build is running",
      "Coffee break"
    ]);
  });

  it("emits no content when there are no messages", () => {
    expect(
      textModule.buildSlides({ settings: DEFAULT_SETTINGS, personalPhotos: [], personalUrls: new Map() })
    ).toEqual([]);
  });
});
