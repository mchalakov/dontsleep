import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const iconsDir = path.join(root, "public", "icons");
const appMark = path.join(root, "public", "app-mark.svg");

async function prepareIcons(): Promise<void> {
  await mkdir(iconsDir, { recursive: true });
  await Promise.all(
    [192, 512].map((size) =>
      sharp(appMark).resize(size, size).png().toFile(path.join(iconsDir, `icon-${size}.png`))
    )
  );
}

await prepareIcons();
