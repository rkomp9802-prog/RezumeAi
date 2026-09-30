import { z } from "zod";
import { SCHEMA_VERSION } from "@/lib/resume/constants";
import { parseResume } from "@/lib/resume/migrations";
import type { Resume, ResumeMeta } from "@/lib/resume/types";

/*
 * localStorage: список резюме (индекс), сами резюме и небольшие настройки интерфейса.
 * Изображения здесь не хранятся — только их id; сами файлы лежат в IndexedDB.
 */

const PREFIX = "rpb:";
const INDEX_KEY = `${PREFIX}index`;
const PREFS_KEY = `${PREFIX}prefs`;
const resumeKey = (id: string) => `${PREFIX}resume:${id}`;

export class StorageError extends Error {}

const metaSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const indexSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  activeId: z.string().nullable(),
  resumes: z.array(metaSchema),
});

export type ResumeIndex = z.infer<typeof indexSchema>;

export const toMeta = (r: Resume): ResumeMeta => ({ id: r.id, name: r.name, createdAt: r.createdAt, updatedAt: r.updatedAt });

function storage(): Storage {
  try {
    const s = window.localStorage;
    const probe = `${PREFIX}probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    throw new StorageError("Хранилище браузера недоступно (например, в приватном режиме). Изменения не сохранятся после закрытия вкладки.");
  }
}

function write(key: string, value: unknown) {
  try {
    storage().setItem(key, JSON.stringify(value));
  } catch (err) {
    if (err instanceof StorageError) throw err;
    throw new StorageError("Не хватает места в хранилище браузера. Удалите ненужные резюме или экспортируйте их в JSON.");
  }
}

export function isStorageAvailable(): boolean {
  try {
    storage();
    return true;
  } catch {
    return false;
  }
}

export function readIndex(): ResumeIndex | null {
  const raw = storage().getItem(INDEX_KEY);
  if (!raw) return null;
  try {
    const parsed = indexSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export const writeIndex = (index: ResumeIndex) => write(INDEX_KEY, index);

/** Читает и проверяет резюме. Повреждённая запись возвращает null и не ломает остальные. */
export function readResume(id: string): Resume | null {
  const raw = storage().getItem(resumeKey(id));
  if (!raw) return null;
  try {
    return parseResume(JSON.parse(raw));
  } catch (err) {
    console.error(`Резюме ${id} повреждено и пропущено`, err);
    return null;
  }
}

export const writeResume = (resume: Resume) => write(resumeKey(resume.id), resume);

export function removeResume(id: string) {
  storage().removeItem(resumeKey(id));
}

/** Удаляет все ключи приложения (и только их). */
export function clearLocalData() {
  const s = storage();
  const keys: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const key = s.key(i);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  for (const key of keys) s.removeItem(key);
}

// ---------- мелкие настройки интерфейса ----------

const prefsSchema = z.object({
  step: z.string().optional(),
  previewMode: z.enum(["resume", "portfolio"]).optional(),
});
export type Prefs = z.infer<typeof prefsSchema>;

export function readPrefs(): Prefs {
  try {
    const parsed = prefsSchema.safeParse(JSON.parse(storage().getItem(PREFS_KEY) ?? "{}"));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function writePrefs(patch: Prefs) {
  try {
    write(PREFS_KEY, { ...readPrefs(), ...patch });
  } catch {
    // настройки интерфейса не критичны
  }
}
