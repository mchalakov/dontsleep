import { clockModule } from "./clock";
import { photosModule } from "./photos";
import type { SlideModule } from "./types";

export const slideModules: SlideModule[] = [photosModule, clockModule];

export function validateModuleRegistry(modules: SlideModule[] = slideModules): void {
  const ids = new Set<string>();
  for (const module of modules) {
    if (!module.id.trim() || ids.has(module.id)) throw new Error(`Duplicate or empty slide module id: ${module.id}`);
    if (!module.label.trim()) throw new Error(`Slide module ${module.id} needs a label.`);
    ids.add(module.id);
  }
}

export function getModule(moduleId: string): SlideModule | undefined {
  return slideModules.find((module) => module.id === moduleId);
}
