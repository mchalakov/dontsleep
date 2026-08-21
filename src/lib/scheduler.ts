export type SlideKind = "photo" | "logo" | "clock";

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

function spaceLogos(slides: SlideDescriptor[]): SlideDescriptor[] {
  const logos = slides.filter((slide) => slide.kind === "logo");
  const other = slides.filter((slide) => slide.kind !== "logo");
  if (!logos.length || !other.length) return slides;
  const result = [...other];
  for (let index = 0; index < logos.length; index += 1) {
    const insertionPoint = Math.min(result.length, Math.max(1, Math.round(((index + 1) * result.length) / (logos.length + 1))));
    result.splice(insertionPoint, 0, logos[index]);
  }
  return result;
}

export function createCoordinatedDeck(
  slides: SlideDescriptor[],
  sessionSeed: string,
  displayOrdinal: number
): SlideDescriptor[] {
  if (!slides.length) return [];
  const arranged = spaceLogos(shuffle(slides, sessionSeed));
  const offset = ((displayOrdinal % arranged.length) + arranged.length) % arranged.length;
  return [...arranged.slice(offset), ...arranged.slice(0, offset)];
}

export function hasConsecutiveLogos(slides: SlideDescriptor[]): boolean {
  return slides.some((slide, index) => slide.kind === "logo" && slides[index - 1]?.kind === "logo");
}
