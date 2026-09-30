import { SCHEMA_VERSION } from "./constants";
import { resumeSchema } from "./schema";
import type { Resume } from "./types";

/*
 * Миграции данных между версиями schemaVersion — для localStorage и импортированных JSON.
 * Сейчас версия одна; новая версия добавляет сюда шаг вида { from: 1, migrate: (data) => ... }.
 */
const MIGRATIONS: { from: number; migrate: (data: Record<string, unknown>) => Record<string, unknown> }[] = [];

export class ResumeFormatError extends Error {}

/** Приводит сырые данные к текущей версии и проверяет их схемой. Ничего не пишет в хранилище. */
export function parseResume(raw: unknown): Resume {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ResumeFormatError("Это не похоже на резюме");
  let data = raw as Record<string, unknown>;
  let version = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;

  if (version > SCHEMA_VERSION) {
    throw new ResumeFormatError("Файл создан более новой версией приложения. Обновите страницу и попробуйте снова.");
  }
  for (const step of MIGRATIONS) {
    if (version === step.from) {
      data = step.migrate(data);
      version = step.from + 1;
    }
  }
  if (version !== SCHEMA_VERSION) throw new ResumeFormatError("Неизвестная версия формата резюме");

  const result = resumeSchema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue?.path.length ? ` (поле ${issue.path.join(".")})` : "";
    throw new ResumeFormatError(`Данные резюме не прошли проверку${where}: ${issue?.message ?? "неверный формат"}`);
  }
  return result.data;
}
