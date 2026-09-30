"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useImageUrls } from "@/features/images/image-url";
import { A4 } from "@/lib/resume/design";
import { buildResumeView } from "@/lib/resume/selectors";
import type { Resume } from "@/lib/resume/types";
import { ResumeSheet } from "./ResumeSheet";

const GUTTER = 48; // поля холста вокруг листа

/** Живой предпросмотр: лист A4, масштабированный под ширину панели, с метками разрывов страниц. */
export function ResumePreview({ resume }: { resume: Resume }) {
  const view = useMemo(() => buildResumeView(resume), [resume]);
  const images = useImageUrls(view.photoId ? [view.photoId] : []);

  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState<number>(A4.heightPx);

  useEffect(() => {
    const container = containerRef.current;
    const sheet = sheetRef.current;
    if (!container || !sheet) return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, Math.max(0.3, (container.clientWidth - GUTTER) / A4.widthPx)));
      setHeight(Math.max(A4.heightPx, sheet.offsetHeight));
    });
    observer.observe(container);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  const pages = Math.max(1, Math.ceil((height - 2) / A4.heightPx));

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-canvas px-6 py-6">
      <div className="mx-auto" style={{ width: A4.widthPx * scale, height: height * scale }}>
        <div
          className="relative origin-top-left shadow-[0_1px_3px_rgb(0_0_0/0.12),0_8px_24px_-12px_rgb(0_0_0/0.18)]"
          style={{ width: A4.widthPx, transform: `scale(${scale})` }}
        >
          <div ref={sheetRef}>
            <ResumeSheet view={view} images={images} />
          </div>
          {/* Примерные границы страниц PDF */}
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="pointer-events-none absolute inset-x-0 border-t border-dashed border-sky-400/70"
              style={{ top: A4.heightPx * (i + 1) }}
            >
              <span className="absolute right-2 -translate-y-1/2 rounded bg-sky-50 px-1.5 text-[11px] text-sky-700">
                стр. {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {pages === 1 ? "1 страница A4" : `Примерно ${pages} стр. A4 — точная разбивка будет в PDF`}
      </p>
    </div>
  );
}
