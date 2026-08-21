import type { SlideDescriptor } from "../lib/scheduler";
import type { StarterMedia } from "../types/media";
import type { SlideModule, SlideRenderProps } from "./types";

interface PhotoPayload {
  src: string;
  description: string;
  focalPoint?: { x: number; y: number };
}

function PhotoRenderer({ slide, displayOrdinal }: SlideRenderProps) {
  const photo = slide.payload as PhotoPayload;
  const motion = (displayOrdinal + slide.id.length) % 4;
  return (
    <figure className={`photo-slide photo-motion-${motion}`}>
      <img
        src={photo.src}
        alt={photo.description}
        style={{ objectPosition: photo.focalPoint ? `${photo.focalPoint.x}% ${photo.focalPoint.y}%` : undefined }}
      />
    </figure>
  );
}

function starterSlide(item: StarterMedia, durationMs: number): SlideDescriptor<PhotoPayload> {
  return {
    id: `starter-${item.id}`,
    moduleId: "photos",
    kind: item.kind,
    durationMs: item.kind === "logo" ? Math.min(durationMs, 14_000) : durationMs,
    payload: { src: item.src, description: item.description, focalPoint: item.focalPoint }
  };
}

export const photosModule: SlideModule = {
  id: "photos",
  label: "Photos",
  description: "Approved starter media and private photos stored only on this computer.",
  defaultEnabled: true,
  settingsSchema: {
    starterEnabled: "boolean",
    personalEnabled: "boolean",
    slideDurationMs: "number"
  },
  buildSlides: ({ settings, starterMedia, personalPhotos, personalUrls }) => {
    const slides: SlideDescriptor[] = [];
    if (settings.starterEnabled) {
      slides.push(...starterMedia.map((item) => starterSlide(item, settings.slideDurationMs)));
    }
    if (settings.personalEnabled) {
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
    }
    return slides;
  },
  Renderer: PhotoRenderer
};
