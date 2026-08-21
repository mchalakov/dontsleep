import type { SlideDescriptor } from "../lib/scheduler";
import type { SlideModule, SlideRenderProps } from "./types";

interface PhotoPayload {
  src: string;
  description: string;
}

function PhotoRenderer({ slide, displayOrdinal }: SlideRenderProps) {
  const photo = slide.payload as PhotoPayload;
  const motion = (displayOrdinal + slide.id.length) % 4;
  return (
    <figure className={`photo-slide photo-motion-${motion}`}>
      <img src={photo.src} alt={photo.description} />
    </figure>
  );
}

export const photosModule: SlideModule = {
  id: "photos",
  label: "Pictures",
  description: "Your private images, stored only in this browser.",
  defaultEnabled: true,
  settingsSchema: { slideDurationMs: "number" },
  buildSlides: ({ settings, personalPhotos, personalUrls }) => {
    const slides: SlideDescriptor[] = [];
    for (const photo of personalPhotos) {
      const src = personalUrls.get(photo.id);
      if (!src) continue;
      slides.push({
        id: `personal-${photo.id}`,
        moduleId: "photos",
        kind: "photo",
        durationMs: settings.slideDurationMs,
        payload: { src, description: photo.name } satisfies PhotoPayload
      });
    }
    return slides;
  },
  Renderer: PhotoRenderer
};
