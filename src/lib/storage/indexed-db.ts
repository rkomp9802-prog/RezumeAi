/*
 * IndexedDB: изображения (фото профиля и картинки проектов) как Blob.
 * В резюме хранится только id изображения, так что localStorage не раздувается Base64-строками.
 */

const DB_NAME = "rpb-images";
const DB_VERSION = 1;
const STORE = "images";

export class ImageStorageError extends Error {}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new ImageStorageError("Браузер не поддерживает хранилище изображений (IndexedDB)."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new ImageStorageError("Не удалось открыть хранилище изображений."));
    req.onblocked = () => reject(new ImageStorageError("Хранилище изображений занято другой вкладкой. Закройте её и повторите."));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req ? req.result : undefined);
      tx.onerror = () => reject(new ImageStorageError("Ошибка хранилища изображений. Возможно, закончилось место на диске."));
      tx.onabort = () => reject(new ImageStorageError("Операция с изображением прервана."));
    });
  } finally {
    db.close();
  }
}

export async function putImage(id: string, blob: Blob): Promise<void> {
  await run("readwrite", (s) => s.put(blob, id));
}

export async function getImage(id: string): Promise<Blob | undefined> {
  return run<Blob>("readonly", (s) => s.get(id) as IDBRequest<Blob>);
}

export async function deleteImages(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await run("readwrite", (s) => {
    for (const id of ids) s.delete(id);
  });
}

/** Есть ли база изображений. Проверка нужна, чтобы не создавать пустую базу ради чтения. */
async function databaseExists(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  if (typeof indexedDB.databases !== "function") return true; // старые браузеры: считаем, что есть
  return (await indexedDB.databases()).some((db) => db.name === DB_NAME);
}

export async function listImageIds(): Promise<string[]> {
  if (!(await databaseExists())) return [];
  const keys = await run<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
  return (keys ?? []).map(String);
}

/** Полностью удаляет базу изображений. */
export function deleteImageDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return resolve();
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(new ImageStorageError("Не удалось удалить изображения."));
    req.onblocked = () => resolve(); // удалится, как только закроются другие вкладки
  });
}
