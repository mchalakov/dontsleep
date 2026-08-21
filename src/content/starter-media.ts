import type { StarterMedia, StarterMediaSource } from "../types/media";

// Add only explicitly approved media here. The production build verifies every entry.
export const starterMediaSources: StarterMediaSource[] = [];

export function validateStarterMediaSources(sources: StarterMediaSource[]): void {
  const ids = new Set<string>();
  for (const item of sources) {
    if (!item.id.trim() || !/^[a-z0-9-]+$/.test(item.id)) {
      throw new Error(`Starter media id must use lowercase letters, numbers, and hyphens: ${item.id}`);
    }
    if (ids.has(item.id)) throw new Error(`Duplicate starter media id: ${item.id}`);
    if (!item.description.trim()) throw new Error(`Starter media ${item.id} needs a description.`);
    if (!item.sourceFile.trim()) throw new Error(`Starter media ${item.id} needs a source file.`);
    ids.add(item.id);
  }
}

function outputExtension(sourceFile: string): "svg" | "webp" {
  return sourceFile.toLowerCase().endsWith(".svg") ? "svg" : "webp";
}

export function toStarterMedia(source: StarterMediaSource): StarterMedia {
  return {
    ...source,
    src: `/starter/${source.id}.${outputExtension(source.sourceFile)}`
  };
}

validateStarterMediaSources(starterMediaSources);
export const starterMedia: StarterMedia[] = starterMediaSources.map(toStarterMedia);
