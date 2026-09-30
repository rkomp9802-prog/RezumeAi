"use client";

import { useEffect, useState } from "react";
import { getImage } from "@/lib/storage/indexed-db";

/*
 * Object URL для изображений из IndexedDB. Один URL на изображение, общий для формы,
 * предпросмотра и портфолио; счётчик ссылок отзывает URL (revokeObjectURL), когда
 * последний потребитель размонтирован — утечек памяти нет.
 */

type Entry = { refs: number; promise: Promise<string | null>; url: string | null; revoked: boolean };
const cache = new Map<string, Entry>();

export function acquireImageUrl(id: string): Promise<string | null> {
  let entry = cache.get(id);
  if (!entry) {
    const created: Entry = { refs: 0, url: null, revoked: false, promise: Promise.resolve(null) };
    created.promise = getImage(id)
      .then((blob) => {
        if (!blob || created.revoked) return null;
        created.url = URL.createObjectURL(blob);
        return created.url;
      })
      .catch(() => null);
    cache.set(id, created);
    entry = created;
  }
  entry.refs += 1;
  return entry.promise;
}

export function releaseImageUrl(id: string): void {
  const entry = cache.get(id);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  entry.revoked = true;
  cache.delete(id);
  // URL мог ещё не создаться — тогда отзовём его сразу после создания
  void entry.promise.then((url) => url && URL.revokeObjectURL(url));
}

/** Отзывает все URL (после удаления всех локальных данных). */
export function revokeAllImageUrls(): void {
  for (const [id, entry] of cache) {
    entry.revoked = true;
    void entry.promise.then((url) => url && URL.revokeObjectURL(url));
    cache.delete(id);
  }
}

export type ImageUrlState = { url: string | null; loading: boolean };

export function useImageUrl(id: string | null): ImageUrlState {
  const [state, setState] = useState<ImageUrlState & { id: string | null }>({ id: null, url: null, loading: false });

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void acquireImageUrl(id).then((url) => {
      if (alive) setState({ id, url, loading: false });
    });
    return () => {
      alive = false;
      releaseImageUrl(id);
    };
  }, [id]);

  if (!id) return { url: null, loading: false };
  // Пока URL для нового id не готов — состояние загрузки, а не старая картинка
  return state.id === id ? { url: state.url, loading: state.loading } : { url: null, loading: true };
}

/** Набор URL для нескольких изображений сразу (предпросмотр портфолио). */
export function useImageUrls(ids: string[]): Record<string, string> {
  const key = ids.join("|");
  const [urls, setUrls] = useState<{ key: string; map: Record<string, string> }>({ key: "", map: {} });

  useEffect(() => {
    const list = key ? key.split("|") : [];
    let alive = true;
    void Promise.all(list.map((id) => acquireImageUrl(id).then((url) => [id, url] as const))).then((pairs) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const [id, url] of pairs) if (url) map[id] = url;
      setUrls({ key, map });
    });
    return () => {
      alive = false;
      for (const id of list) releaseImageUrl(id);
    };
  }, [key]);

  return urls.key === key ? urls.map : {};
}
