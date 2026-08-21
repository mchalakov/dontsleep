import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { starterMediaSources, validateStarterMediaSources } from "../src/content/starter-media";

const root = process.cwd();
const starterSourceDir = path.join(root, "src", "assets", "starter");
const starterOutputDir = path.join(root, "public", "starter");
const iconsDir = path.join(root, "public", "icons");
const appMark = path.join(root, "public", "app-mark.svg");
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_PACK_BYTES = 30 * 1024 * 1024;

async function prepareIcons(): Promise<void> {
  await mkdir(iconsDir, { recursive: true });
  await Promise.all(
    [192, 512].map((size) =>
      sharp(appMark).resize(size, size).png().toFile(path.join(iconsDir, `icon-${size}.png`))
    )
  );
}

async function prepareStarterMedia(): Promise<void> {
  validateStarterMediaSources(starterMediaSources);
  await rm(starterOutputDir, { recursive: true, force: true });
  await mkdir(starterOutputDir, { recursive: true });
  let outputBytes = 0;

  for (const item of starterMediaSources) {
    const sourcePath = path.join(starterSourceDir, item.sourceFile);
    const sourceStats = await stat(sourcePath).catch(() => null);
    if (!sourceStats?.isFile()) throw new Error(`Missing approved starter source: ${item.sourceFile}`);
    if (sourceStats.size > MAX_SOURCE_BYTES) throw new Error(`${item.sourceFile} exceeds the 20 MiB source limit.`);

    const isSvg = item.sourceFile.toLowerCase().endsWith(".svg");
    const outputPath = path.join(starterOutputDir, `${item.id}.${isSvg ? "svg" : "webp"}`);
    if (isSvg) {
      await cp(sourcePath, outputPath);
    } else {
      await sharp(sourcePath)
        .rotate()
        .resize({ width: 3840, height: 3840, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84, effort: 5 })
        .toFile(outputPath);
    }
    outputBytes += (await stat(outputPath)).size;
  }

  if (outputBytes > MAX_PACK_BYTES) throw new Error("Optimized starter collection exceeds the 30 MiB offline budget.");
}

await Promise.all([prepareIcons(), prepareStarterMedia()]);
