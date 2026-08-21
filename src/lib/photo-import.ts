import type { StoredPhoto } from "../types/media";

const THUMBNAIL_SIZE = 320;

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function makeThumbnail(image: HTMLImageElement, mimeType: string): Promise<Blob> {
  const scale = Math.min(1, THUMBNAIL_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot prepare image previews.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const outputType = mimeType === "image/png" ? "image/png" : "image/webp";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Unable to create an image preview."))),
      outputType,
      0.8
    );
  });
}

export async function importPhoto(file: File): Promise<StoredPhoto> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not a supported image.`);
  const image = await loadImage(file);
  const thumbnail = await makeThumbnail(image, file.type);
  return {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type,
    blob: file,
    thumbnail,
    width: image.naturalWidth,
    height: image.naturalHeight,
    size: file.size,
    createdAt: Date.now()
  };
}

export async function importPhotos(files: File[]): Promise<{ photos: StoredPhoto[]; errors: string[] }> {
  const photos: StoredPhoto[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      photos.push(await importPhoto(file));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Unable to import ${file.name}.`);
    }
  }
  return { photos, errors };
}
