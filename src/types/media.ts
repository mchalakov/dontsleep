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

export interface TextMessage {
  id: string;
  text: string;
  createdAt: number;
}

export interface AppSettings {
  enabledModules: Record<string, boolean>;
  slideDurationMs: number;
  textMessages: TextMessage[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  enabledModules: { photos: true, clock: true, text: true },
  slideDurationMs: 18_000,
  textMessages: []
};
