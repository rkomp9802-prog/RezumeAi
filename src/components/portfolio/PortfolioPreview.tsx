"use client";

import { useMemo } from "react";
import { useImageUrls } from "@/features/images/image-url";
import { renderPortfolioSite } from "@/lib/portfolio/render-site";
import { buildResumeView } from "@/lib/resume/selectors";
import type { Resume } from "@/lib/resume/types";

/**
 * Предпросмотр мини-сайта: тот же HTML, что попадёт в index.html архива,
 * только стили встроены, а картинки — object URL из IndexedDB.
 * iframe без скриптов (sandbox), ссылки открываются в новой вкладке.
 */
export function PortfolioPreview({ resume, title = "Предпросмотр портфолио" }: { resume: Resume; title?: string }) {
  const view = useMemo(() => buildResumeView(resume), [resume]);
  const projects = view.sections.find((s) => s.id === "projects");
  const projectItems = projects?.id === "projects" ? projects.items.filter((p) => p.imageId) : [];
  const ids = [view.photoId, ...projectItems.map((p) => p.imageId)].filter((id): id is string => !!id);
  const urls = useImageUrls(ids);

  const html = useMemo(() => {
    const projectImages: Record<string, string> = {};
    for (const p of projectItems) if (p.imageId && urls[p.imageId]) projectImages[p.id] = urls[p.imageId];
    return renderPortfolioSite(view, {
      photo: view.photoId ? urls[view.photoId] : undefined,
      projectImages,
      fontUrl: (file) => `${window.location.origin}/fonts/${file}`,
      stylesheet: { inline: true },
    }).html;
    // projectItems вычисляется из view — отдельная зависимость не нужна
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, urls]);

  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="size-full border-0 bg-white"
    />
  );
}
