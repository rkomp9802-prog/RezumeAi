import { imageToJpegDataUrl } from "@/features/images/image-service";
import { buildResumeView } from "@/lib/resume/selectors";
import type { Resume } from "@/lib/resume/types";
import { fileSafeName } from "@/lib/resume/utils";
import { downloadBlob } from "../download";

export class PdfError extends Error {}

/**
 * Генерирует PDF (A4) и скачивает его. @react-pdf/renderer тяжёлый,
 * поэтому загружается только при нажатии «Скачать PDF».
 */
export async function exportResumePdf(resume: Resume): Promise<void> {
  try {
    const [{ pdf }, { ResumePdf, registerPdfFonts }] = await Promise.all([import("@react-pdf/renderer"), import("./ResumePdf")]);
    registerPdfFonts(window.location.origin);
    const view = buildResumeView(resume);
    // react-pdf не читает WebP — фото передаём как JPEG
    const photo = view.photoId ? await imageToJpegDataUrl(view.photoId) : null;
    const blob = await pdf(ResumePdf({ view, photo })).toBlob();
    const name = fileSafeName(view.fullName ? `Резюме ${view.fullName}` : resume.name);
    downloadBlob(blob, `${name}.pdf`);
  } catch (err) {
    console.error(err);
    throw new PdfError("Не удалось создать PDF. Проверьте соединение (нужны файлы шрифтов) и попробуйте снова.");
  }
}
