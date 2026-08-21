import { DEFAULT_SETTINGS, type AppSettings, type StoredPhoto } from "../types/media";

const DB_NAME = "dontsleep";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";
const SETTINGS_STORE = "settings";
const SETTINGS_KEY = "app";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
  });
}

let databasePromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in globalThis)) {
        reject(new Error("Local photo storage is not available in this browser."));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(PHOTO_STORE)) {
          database.createObjectStore(PHOTO_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open local photo storage."));
      request.onblocked = () => reject(new Error("Close other Don’t Sleep windows, then try again."));
    });
  }
  return databasePromise;
}

export async function listPhotos(): Promise<StoredPhoto[]> {
  const database = await openDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readonly");
  const photos = await requestResult(transaction.objectStore(PHOTO_STORE).getAll() as IDBRequest<StoredPhoto[]>);
  await transactionDone(transaction);
  return photos.sort((a, b) => b.createdAt - a.createdAt);
}

export async function savePhotos(photos: StoredPhoto[]): Promise<void> {
  if (!photos.length) return;
  const database = await openDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  for (const photo of photos) transaction.objectStore(PHOTO_STORE).put(photo);
  await transactionDone(transaction);
}

export async function removePhoto(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  transaction.objectStore(PHOTO_STORE).delete(id);
  await transactionDone(transaction);
}

export async function clearPhotos(): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(PHOTO_STORE, "readwrite");
  transaction.objectStore(PHOTO_STORE).clear();
  await transactionDone(transaction);
}

export async function loadSettings(): Promise<AppSettings> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS_STORE, "readonly");
  const stored = await requestResult(
    transaction.objectStore(SETTINGS_STORE).get(SETTINGS_KEY) as IDBRequest<Partial<AppSettings> | undefined>
  );
  await transactionDone(transaction);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    enabledModules: { ...DEFAULT_SETTINGS.enabledModules, ...stored?.enabledModules }
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(SETTINGS_STORE, "readwrite");
  transaction.objectStore(SETTINGS_STORE).put(settings, SETTINGS_KEY);
  await transactionDone(transaction);
}

export async function requestPersistentStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  return navigator.storage.persist();
}

export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null;
  return navigator.storage.estimate();
}

export async function resetDatabaseForTests(): Promise<void> {
  if (databasePromise) {
    const database = await databasePromise.catch(() => null);
    database?.close();
  }
  databasePromise = null;
}
