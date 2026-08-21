import type { SlideDescriptor } from "../lib/scheduler";
import type { SlideModule, SlideRenderProps } from "./types";

interface TextPayload {
  text: string;
  variant: number;
}

function TextRenderer({ slide, displayOrdinal }: SlideRenderProps) {
  const payload = slide.payload as TextPayload;
  const zone = (payload.variant + displayOrdinal) % 6;
  return (
    <section className={`text-slide text-zone-${zone}`}>
      <p>{payload.text}</p>
    </section>
  );
}

export const textModule: SlideModule = {
  id: "text",
  label: "Text",
  description: "Custom messages that move around the display.",
  defaultEnabled: true,
  settingsSchema: { textMessages: "array" },
  buildSlides: ({ settings }) =>
    settings.textMessages.map(
      (message, variant): SlideDescriptor<TextPayload> => ({
        id: `text-${message.id}`,
        moduleId: "text",
        kind: "text",
        durationMs: settings.slideDurationMs,
        payload: { text: message.text, variant }
      })
    ),
  Renderer: TextRenderer
};
