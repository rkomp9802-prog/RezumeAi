import { z } from "zod";
import { blobToDataUrl } from "@/features/images/image-service";
import { addImportedResume } from "@/features/resumes/store";
import { SCHEMA_VERSION } from "@/lib/resume/constants";
import { parseResume, ResumeFormatError } from "@/lib/resume/migrations";
import { collectImageIds } from "@/lib/resume/selectors";
import type { Resume } from "@/lib/resume/types";
import { fileSafeName } from "@/lib/resume/utils";
import { getImage } from "@/lib/storage/indexed-db";
import { downloadBlob } from "./download";

/*
 * JSON-файл резюме: данные модели Resume + изображения как data URL (Base64).
 * Base64 живёт только в этом файле — внутри приложения изображения хранятся в IndexedDB.
 */

const FORMAT = "resume-portfolio-builder";

const envelopeSchema = z.object({
  format: z.literal(FORMAT),
  schemaVersion: z.number().int(),
  exportedAt: z.string().optional(),
  resume: z.unknown(),
  images: z.record(z.string(), z.string()).default({}),
});

export async function exportResumeJson(resume: Resume): Promise<void> {
  const images: Record<string, string> = {};
  for (const id of collectImageIds(resume)) {
    const blob = await getImage(id);
    if (blob) images[id] = await blobToDataUrl(blob);
  }
  const file = { format: FORMAT, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), resume, images };
  downloadBlob(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }), `${fileSafeName(resume.name)}.json`);
}

const MAX_IMPORT_BYTES = 40 * 1024 * 1024;

/**
 * Читает файл, проверяет структуру через Zod и добавляет резюме как новое.
 * При любой ошибке существующие данные не меняются.
 */
export async function importResumeFile(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_BYTES) throw new ResumeFormatError("Файл слишком большой для резюме (больше 40 МБ).");
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    throw new ResumeFormatError("Файл не является корректным JSON. Выберите файл, экспортированный из этого приложения.");
  }

  // Поддерживаем и наш формат-обёртку, и «голый» объект Resume
  const envelope = envelopeSchema.safeParse(raw);
  const resume = parseResume(envelope.success ? envelope.data.resume : raw);
  const images = envelope.success ? envelope.data.images : {};
  return addImportedResume(resume, images);
}
