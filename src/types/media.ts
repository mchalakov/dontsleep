export type StarterMediaKind = "photo" | "logo";

export interface FocalPoint {
  x: number;
  y: number;
}

export interface StarterMediaSource {
  id: string;
  sourceFile: string;
  description: string;
  kind: StarterMediaKind;
  focalPoint?: FocalPoint;
}

export interface StarterMedia extends StarterMediaSource {
  src: string;
}

export interface StoredPhoto {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  size: number;
  createdAt: number;
}

export interface AppSettings {
  enabledModules: Record<string, boolean>;
  starterEnabled: boolean;
  personalEnabled: boolean;
  slideDurationMs: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  enabledModules: { photos: true, clock: true },
  starterEnabled: true,
  personalEnabled: false,
  slideDurationMs: 18_000
};
