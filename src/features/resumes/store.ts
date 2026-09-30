"use client";

import { useSyncExternalStore } from "react";
import { cloneImage, collectImageGarbage, dataUrlToBlob, saveImage } from "@/features/images/image-service";
import { revokeAllImageUrls } from "@/features/images/image-url";
import { AUTOSAVE_DELAY_MS, HISTORY_LIMIT, SCHEMA_VERSION } from "@/lib/resume/constants";
import { createResume } from "@/lib/resume/defaults";
import { collectImageIds } from "@/lib/resume/selectors";
import type { Resume, ResumeMeta } from "@/lib/resume/types";
import { createId } from "@/lib/resume/utils";
import { deleteImageDatabase } from "@/lib/storage/indexed-db";
import {
  clearLocalData,
  readIndex,
  readResume,
  removeResume,
  StorageError,
  toMeta,
  writeIndex,
  writeResume,
} from "@/lib/storage/local-storage";

/*
 * Единое состояние приложения. Здесь живёт единственная копия текущего резюме:
 * форма меняет её, а предпросмотр, PDF, портфолио, JSON и AI читают её же.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type EditorState = {
  status: "loading" | "ready";
  resumes: ResumeMeta[];
  resume: Resume | null; // активное резюме
  past: Resume[];
  future: Resume[];
  /** Растёт при изменениях не из формы (undo, redo, AI, импорт, переключение) — формы по нему сбрасываются. */
  externalRevision: number;
  save: { status: SaveStatus; error: string | null };
  storageError: string | null;
};

const initialState: EditorState = {
  status: "loading",
  resumes: [],
  resume: null,
  past: [],
  future: [],
  externalRevision: 0,
  save: { status: "idle", error: null },
  storageError: null,
};

let state = initialState;
const listeners = new Set<() => void>();

function setState(patch: Partial<EditorState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getEditorState = () => state;

/** Подписка на часть состояния. Селектор должен возвращать уже существующие значения, а не новые объекты. */
export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

// ---------- сохранение ----------

let saveTimer: ReturnType<typeof setTimeout> | undefined;

const errorMessage = (err: unknown) =>
  err instanceof StorageError ? err.message : "Не удалось сохранить изменения. Данные остаются в открытой вкладке — не закрывайте её.";

function persistIndex(resumes: ResumeMeta[], activeId: string | null) {
  writeIndex({ schemaVersion: SCHEMA_VERSION, activeId, resumes });
}

/** Записывает текущее резюме и индекс. При ошибке данные остаются в памяти. */
function flushSave(): void {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const { resume, resumes } = state;
  if (!resume) return;
  try {
    writeResume(resume);
    const next = resumes.map((m) => (m.id === resume.id ? toMeta(resume) : m));
    persistIndex(next, resume.id);
    setState({ resumes: next, save: { status: "saved", error: null } });
  } catch (err) {
    setState({ save: { status: "error", error: errorMessage(err) } });
  }
}

function scheduleSave() {
  setState({ save: { status: "saving", error: null } });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, AUTOSAVE_DELAY_MS);
}

/** Повторить сохранение (кнопка у статуса «Ошибка сохранения»). */
export const retrySave = flushSave;

// ---------- изменения резюме ----------

let lastCoalesce: { key: string; at: number } | null = null;
const COALESCE_MS = 1200;

type MutateOptions = {
  /** "form" — ввод в поле: форму не сбрасываем. Остальное — внешнее изменение. */
  source?: "form" | "external";
  /** Одинаковый ключ в течение 1,2 с склеивает изменения в один шаг отмены (набор текста). */
  coalesceKey?: string;
};

/** Изменяет активное резюме через черновик-копию и записывает шаг в историю. */
export function mutateResume(recipe: (draft: Resume) => void, options: MutateOptions = {}): void {
  const prev = state.resume;
  if (!prev) return;
  const draft = structuredClone(prev);
  recipe(draft);
  draft.updatedAt = Date.now();

  const now = Date.now();
  const coalesce = options.coalesceKey && lastCoalesce?.key === options.coalesceKey && now - lastCoalesce.at < COALESCE_MS;
  lastCoalesce = options.coalesceKey ? { key: options.coalesceKey, at: now } : null;

  setState({
    resume: draft,
    past: coalesce ? state.past : [...state.past, prev].slice(-HISTORY_LIMIT),
    future: [],
    externalRevision: options.source === "form" ? state.externalRevision : state.externalRevision + 1,
  });
  scheduleSave();
}

export function undo(): void {
  const { past, future, resume } = state;
  if (!past.length || !resume) return;
  lastCoalesce = null;
  setState({
    resume: past[past.length - 1],
    past: past.slice(0, -1),
    future: [resume, ...future].slice(0, HISTORY_LIMIT),
    externalRevision: state.externalRevision + 1,
  });
  scheduleSave();
}

export function redo(): void {
  const { past, future, resume } = state;
  if (!future.length || !resume) return;
  lastCoalesce = null;
  setState({
    resume: future[0],
    past: [...past, resume].slice(-HISTORY_LIMIT),
    future: future.slice(1),
    externalRevision: state.externalRevision + 1,
  });
  scheduleSave();
}

// ---------- загрузка и список резюме ----------

function activate(resume: Resume, resumes: ResumeMeta[]) {
  lastCoalesce = null;
  setState({
    status: "ready",
    resume,
    resumes,
    past: [],
    future: [],
    externalRevision: state.externalRevision + 1,
    save: { status: "saved", error: null },
  });
  try {
    persistIndex(resumes, resume.id);
  } catch (err) {
    setState({ save: { status: "error", error: errorMessage(err) } });
  }
}

/** Все id изображений, которые нужно сохранить: все резюме в хранилище и история текущего. */
function referencedImages(resumes: ResumeMeta[]): Set<string> {
  const ids = new Set<string>();
  for (const meta of resumes) {
    const r = meta.id === state.resume?.id ? state.resume : readResume(meta.id);
    if (r) for (const id of collectImageIds(r)) ids.add(id);
  }
  for (const r of [...state.past, ...state.future]) for (const id of collectImageIds(r)) ids.add(id);
  return ids;
}

function garbageCollect() {
  try {
    void collectImageGarbage(referencedImages(state.resumes)).catch(() => {});
  } catch {
    // сборка мусора не критична
  }
}

let initStarted = false;

/** Восстанавливает данные при открытии приложения. Вызывается один раз на клиенте. */
export function initEditor(): void {
  if (initStarted) return;
  initStarted = true;

  try {
    const index = readIndex();
    const resumes: ResumeMeta[] = [];
    let active: Resume | null = null;
    for (const meta of index?.resumes ?? []) {
      const r = readResume(meta.id);
      if (!r) continue; // повреждённые записи пропускаем, остальные открываются
      resumes.push(toMeta(r));
      if (r.id === index?.activeId) active = r;
    }
    if (!resumes.length) {
      const first = createResume("Моё резюме");
      writeResume(first);
      resumes.push(toMeta(first));
      active = first;
    }
    activate(active ?? readResume(resumes[0].id) ?? createResume(), resumes);
    garbageCollect();
  } catch (err) {
    // localStorage недоступен: работаем в памяти и честно предупреждаем
    const first = createResume("Моё резюме");
    setState({
      status: "ready",
      resume: first,
      resumes: [toMeta(first)],
      storageError: errorMessage(err),
      save: { status: "error", error: errorMessage(err) },
    });
  }
}

/** Сохраняет несохранённое перед уходом со страницы. */
if (typeof window !== "undefined") {
  const flushIfPending = () => saveTimer !== undefined && flushSave();
  window.addEventListener("pagehide", flushIfPending);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flushIfPending());
}

function withStorage<T>(action: () => T): T {
  try {
    return action();
  } catch (err) {
    throw new StorageError(errorMessage(err));
  }
}

export function switchResume(id: string): void {
  if (id === state.resume?.id) return;
  flushSave();
  const next = withStorage(() => readResume(id));
  if (!next) throw new StorageError("Не удалось открыть резюме: данные повреждены.");
  activate(next, state.resumes);
}

export function createNewResume(name = "Новое резюме"): string {
  flushSave();
  const resume = createResume(name);
  withStorage(() => writeResume(resume));
  activate(resume, [...state.resumes, toMeta(resume)]);
  return resume.id;
}

export function renameResume(id: string, rawName: string): void {
  const name = rawName.trim().slice(0, 120) || "Без названия";
  if (id === state.resume?.id) {
    mutateResume((d) => void (d.name = name));
    return;
  }
  withStorage(() => {
    const r = readResume(id);
    if (!r) return;
    const renamed = { ...r, name, updatedAt: Date.now() };
    writeResume(renamed);
    const resumes = state.resumes.map((m) => (m.id === id ? toMeta(renamed) : m));
    persistIndex(resumes, state.resume?.id ?? null);
    setState({ resumes });
  });
}

/** Копия резюме со своими копиями изображений. Возвращает id копии. */
export async function duplicateResume(id: string): Promise<string> {
  if (id === state.resume?.id) flushSave();
  const source = withStorage(() => readResume(id));
  if (!source) throw new StorageError("Не удалось скопировать резюме: данные повреждены.");

  const copy = structuredClone(source);
  const now = Date.now();
  copy.id = createId();
  copy.name = `${source.name} (копия)`.slice(0, 120);
  copy.createdAt = now;
  copy.updatedAt = now;
  if (copy.personal.photo) copy.personal.photo = await cloneImage(copy.personal.photo);
  for (const p of copy.projects) if (p.image) p.image = await cloneImage(p.image);

  withStorage(() => {
    writeResume(copy);
    const at = state.resumes.findIndex((m) => m.id === id);
    const resumes = [...state.resumes];
    resumes.splice(at + 1, 0, toMeta(copy));
    persistIndex(resumes, state.resume?.id ?? null);
    setState({ resumes });
  });
  return copy.id;
}

export function deleteResume(id: string): void {
  withStorage(() => {
    removeResume(id);
    const resumes = state.resumes.filter((m) => m.id !== id);
    if (id !== state.resume?.id) {
      persistIndex(resumes, state.resume?.id ?? null);
      setState({ resumes });
    } else if (resumes.length) {
      activate(readResume(resumes[0].id) ?? createResume(), resumes);
    } else {
      const fresh = createResume("Моё резюме");
      writeResume(fresh);
      activate(fresh, [toMeta(fresh)]);
    }
  });
  garbageCollect();
}

/** Добавляет импортированное резюме как новое — существующие данные не меняются. */
export async function addImportedResume(resume: Resume, images: Record<string, string>): Promise<string> {
  flushSave();
  const copy = structuredClone(resume);
  const now = Date.now();
  copy.id = createId();
  copy.createdAt = now;
  copy.updatedAt = now;

  // Картинки из файла сохраняем под новыми id; битые пропускаем, не ломая импорт
  const remap = async (oldId: string | null) => {
    if (!oldId || !images[oldId]) return null;
    try {
      return await saveImage(await dataUrlToBlob(images[oldId]));
    } catch {
      return null;
    }
  };
  copy.personal.photo = await remap(copy.personal.photo);
  for (const p of copy.projects) p.image = await remap(p.image);

  withStorage(() => writeResume(copy));
  activate(copy, [...state.resumes, toMeta(copy)]);
  return copy.id;
}

/** Удаляет все резюме, настройки, изображения и начинает с чистого листа. */
export async function clearAllData(): Promise<void> {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  revokeAllImageUrls();
  try {
    clearLocalData();
  } catch {
    // хранилище недоступно — чистить нечего
  }
  await deleteImageDatabase();
  // Счётчик не сбрасываем: формы должны увидеть, что данные сменились
  state = { ...initialState, externalRevision: state.externalRevision };
  initStarted = false;
  initEditor();
}
