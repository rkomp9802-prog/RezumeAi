"use client";

import { createListItem } from "@/lib/resume/defaults";
import type { SectionId } from "@/lib/resume/constants";
import type { Design, ListItem, ListSectionKey, Resume } from "@/lib/resume/types";
import { mutateResume } from "./store";

/*
 * Типовые изменения резюме. Все идут через mutateResume — значит, попадают в историю undo/redo
 * и в автосохранение.
 */

type Item = { id: string; hidden: boolean };
const listOf = (draft: Resume, key: ListSectionKey) => draft[key] as Item[];
const setList = (draft: Resume, key: ListSectionKey, items: Item[]) => {
  (draft as Record<ListSectionKey, Item[]>)[key] = items;
};

export function addItem(key: ListSectionKey): string {
  const item = createListItem(key);
  mutateResume((d) => setList(d, key, [...listOf(d, key), item]));
  return item.id;
}

export function removeItem(key: ListSectionKey, id: string) {
  mutateResume((d) => setList(d, key, listOf(d, key).filter((i) => i.id !== id)));
}

export function toggleItemHidden(key: ListSectionKey, id: string) {
  mutateResume((d) => setList(d, key, listOf(d, key).map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i))));
}

export function moveItem(key: ListSectionKey, from: number, to: number) {
  if (from === to) return;
  mutateResume((d) => setList(d, key, arrayMove(listOf(d, key), from, to)));
}

/** Ввод в форму записи: форму не сбрасываем, набор в одно поле склеиваем в один шаг отмены. */
export function updateItem<K extends ListSectionKey>(key: K, id: string, values: Partial<ListItem<K>>, field: string) {
  mutateResume(
    (d) => setList(d, key, listOf(d, key).map((i) => (i.id === id ? { ...i, ...values, id } : i))),
    { source: "form", coalesceKey: `${key}.${id}.${field}` },
  );
}

/** Ввод в форму раздела-объекта (personal, about, contacts). */
export function updateObject<K extends "personal" | "about" | "contacts">(key: K, values: Partial<Resume[K]>, field: string) {
  mutateResume(
    (d) => {
      d[key] = { ...d[key], ...values };
    },
    { source: "form", coalesceKey: `${key}.${field}` },
  );
}

export function setSectionHidden(id: SectionId, hidden: boolean) {
  mutateResume((d) => {
    d.sections = d.sections.map((s) => (s.id === id ? { ...s, hidden } : s));
  });
}

export function moveSection(from: number, to: number) {
  if (from === to) return;
  mutateResume((d) => {
    d.sections = arrayMove(d.sections, from, to);
  });
}

export function updateDesign(patch: Partial<Design>) {
  mutateResume((d) => {
    d.design = { ...d.design, ...patch };
  });
}

export function setPhoto(imageId: string | null) {
  mutateResume((d) => {
    d.personal.photo = imageId;
  });
}

export function setProjectImage(projectId: string, imageId: string | null) {
  mutateResume((d) => {
    d.projects = d.projects.map((p) => (p.id === projectId ? { ...p, image: imageId } : p));
  });
}

export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// ---------- применение подтверждённых AI-предложений ----------
// Внешнее изменение: форма сбрасывается к новым данным, шаг можно отменить через undo

export function applyAboutSummary(summary: string) {
  mutateResume((d) => {
    d.about.summary = summary;
  });
}

export function applyExperiencePatch(patches: { id: string; description?: string; achievements?: string[] }[]) {
  mutateResume((d) => {
    d.experience = d.experience.map((e) => {
      const patch = patches.find((p) => p.id === e.id);
      return patch ? { ...e, ...patch, id: e.id } : e;
    });
  });
}
