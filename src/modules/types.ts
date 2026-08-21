import type { ComponentType } from "react";
import type { SlideDescriptor } from "../lib/scheduler";
import type { AppSettings, StarterMedia, StoredPhoto } from "../types/media";

export interface ModuleBuildContext {
  settings: AppSettings;
  starterMedia: StarterMedia[];
  personalPhotos: StoredPhoto[];
  personalUrls: Map<string, string>;
}

export interface SlideRenderProps {
  slide: SlideDescriptor;
  displayOrdinal: number;
}

export interface SlideModule {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  settingsSchema: Readonly<Record<string, string>>;
  buildSlides(context: ModuleBuildContext): SlideDescriptor[];
  Renderer: ComponentType<SlideRenderProps>;
}
