export type SlideKind = "photo" | "clock" | "text";

export interface SlideDescriptor<T = unknown> {
  id: string;
  moduleId: string;
  kind: SlideKind;
  durationMs: number;
  payload: T;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFactory(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
}

function shuffle<T>(items: T[], seed: string): T[] {
  const random = randomFactory(seed);
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

export function createCoordinatedDeck(
  slides: SlideDescriptor[],
  sessionSeed: string,
  displayOrdinal: number
): SlideDescriptor[] {
  if (!slides.length) return [];
  const arranged = shuffle(slides, sessionSeed);
  const offset = ((displayOrdinal % arranged.length) + arranged.length) % arranged.length;
  return [...arranged.slice(offset), ...arranged.slice(0, offset)];
}
