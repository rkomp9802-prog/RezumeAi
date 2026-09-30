import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "@/lib/resume/constants";
import { createId } from "@/lib/resume/utils";
import { deleteImages, getImage, listImageIds, putImage } from "@/lib/storage/indexed-db";

export class ImageError extends Error {}

export type CropArea = { x: number; y: number; width: number; height: number };

/** Проверка до загрузки: формат и размер. */
export function validateImageFile(file: File): void {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageError("Поддерживаются только JPEG, PNG и WebP.");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new ImageError(`Файл весит ${mb} МБ — максимум 5 МБ. Сожмите изображение и попробуйте снова.`);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageError("Не удалось прочитать изображение. Возможно, файл повреждён."));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageError("Не удалось обработать изображение."))), type, quality),
  );
}

/**
 * Вырезает область и уменьшает до maxWidth. Результат — WebP
 * (браузеры без кодировщика WebP вернут PNG — он тоже поддерживается).
 */
export async function cropToBlob(src: string, area: CropArea, maxWidth: number): Promise<Blob> {
  const img = await loadImage(src);
  const scale = Math.min(1, maxWidth / area.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(area.width * scale));
  canvas.height = Math.max(1, Math.round(area.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageError("Браузер не поддерживает обработку изображений.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/webp", 0.9);
}

/** Сохраняет изображение в IndexedDB под новым id. */
export async function saveImage(blob: Blob): Promise<string> {
  const id = createId();
  await putImage(id, blob);
  return id;
}

/** Копия изображения под новым id — у копии резюме свои картинки. */
export async function cloneImage(id: string): Promise<string | null> {
  const blob = await getImage(id);
  return blob ? saveImage(blob) : null;
}

/** Удаляет из IndexedDB изображения, на которые не ссылается ни одно резюме. */
export async function collectImageGarbage(referenced: Set<string>): Promise<void> {
  const ids = await listImageIds();
  await deleteImages(ids.filter((id) => !referenced.has(id)));
}

// ---------- конвертация для экспорта ----------

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageError("Не удалось прочитать изображение."));
    reader.readAsDataURL(blob);
  });
}

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Data URL из импортируемого JSON → Blob, с той же проверкой формата и размера, что и при загрузке. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const match = DATA_URL_RE.exec(dataUrl);
  if (!match) throw new ImageError("Изображение в файле повреждено или имеет неподдерживаемый формат.");
  if ((match[2].length * 3) / 4 > IMAGE_MAX_BYTES) throw new ImageError("Изображение в файле больше 5 МБ.");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

/**
 * JPEG на белом фоне для PDF: react-pdf не умеет WebP.
 */
export async function imageToJpegDataUrl(id: string): Promise<string | null> {
  const blob = await getImage(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}
