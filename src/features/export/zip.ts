import { renderPortfolioSite } from "@/lib/portfolio/render-site";
import { FONT_WEIGHTS, fontFileName } from "@/lib/resume/constants";
import { buildResumeView } from "@/lib/resume/selectors";
import type { Resume } from "@/lib/resume/types";
import { getImage } from "@/lib/storage/indexed-db";
import { downloadBlob } from "./download";

export class ZipError extends Error {}

const extOf = (blob: Blob) => (blob.type === "image/png" ? "png" : blob.type === "image/jpeg" ? "jpg" : "webp");

const README = `Мини-сайт портфолио

Откройте index.html в браузере — сайт работает прямо из папки, без интернета и сервера.

Чтобы получить публичную ссылку, загрузите содержимое папки на любой статический хостинг:
GitHub Pages, Netlify, Cloudflare Pages или обычный веб-сервер (например, Nginx).
`;

/**
 * portfolio.zip: /index.html, /styles.css, /assets/ (фото, картинки проектов, шрифт).
 * Все пути относительные — сайт открывается локально и на любом статическом хостинге.
 */
export async function exportPortfolioZip(resume: Resume): Promise<void> {
  const { default: JSZip } = await import("jszip");
  const view = buildResumeView(resume);
  const zip = new JSZip();

  let photo: string | undefined;
  if (view.photoId) {
    const blob = await getImage(view.photoId);
    if (blob) {
      photo = `assets/profile.${extOf(blob)}`;
      zip.file(photo, blob);
    }
  }

  const projectImages: Record<string, string> = {};
  const projects = view.sections.find((s) => s.id === "projects");
  if (projects?.id === "projects") {
    let n = 0;
    for (const p of projects.items) {
      if (!p.imageId) continue;
      const blob = await getImage(p.imageId);
      if (!blob) continue;
      n += 1;
      const path = `assets/project-${n}.${extOf(blob)}`;
      zip.file(path, blob);
      projectImages[p.id] = path;
    }
  }

  for (const weight of FONT_WEIGHTS) {
    const file = fontFileName(view.design.font, weight);
    const res = await fetch(`/fonts/${file}`);
    if (!res.ok) throw new ZipError("Не удалось добавить шрифт в архив. Проверьте соединение и попробуйте снова.");
    zip.file(`assets/fonts/${file}`, await res.blob());
  }

  const { html, css } = renderPortfolioSite(view, {
    photo,
    projectImages,
    fontUrl: (file) => `assets/fonts/${file}`, // относительно styles.css
    stylesheet: { href: "styles.css" },
  });
  zip.file("index.html", html);
  zip.file("styles.css", css);
  zip.file("README.txt", README);

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  downloadBlob(blob, "portfolio.zip");
}
