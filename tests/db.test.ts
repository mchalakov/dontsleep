import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearPhotos, listPhotos, loadSettings, resetDatabaseForTests, savePhotos, saveSettings } from "../src/lib/db";
import { DEFAULT_SETTINGS, type StoredPhoto } from "../src/types/media";

async function deleteDatabase(): Promise<void> {
  await resetDatabaseForTests();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("dontsleep");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe("local persistence", () => {
  beforeEach(deleteDatabase);
  afterEach(deleteDatabase);

  it("persists settings with defaults", async () => {
    const settings = { ...DEFAULT_SETTINGS, personalEnabled: true, enabledModules: { photos: false, clock: true } };
    await saveSettings(settings);
    await expect(loadSettings()).resolves.toEqual(settings);
  });

  it("stores and clears personal photos", async () => {
    const photo: StoredPhoto = {
      id: "photo-1",
      name: "desk.jpg",
      mimeType: "image/jpeg",
      blob: new Blob(["photo"], { type: "image/jpeg" }),
      thumbnail: new Blob(["thumb"], { type: "image/webp" }),
      width: 1600,
      height: 900,
      size: 5,
      createdAt: 10
    };
    await savePhotos([photo]);
    expect((await listPhotos()).map((item) => item.id)).toEqual(["photo-1"]);
    await clearPhotos();
    await expect(listPhotos()).resolves.toEqual([]);
  });
});
