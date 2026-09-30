import { z } from "zod";
import {
  DEFAULT_ACCENT,
  DENSITIES,
  FONTS,
  LANGUAGE_LEVELS,
  LIMITS,
  SCHEMA_VERSION,
  SECTION_IDS,
  SKILL_LEVELS,
  SOCIAL_NETWORKS,
  TEMPLATES,
  type SectionId,
} from "./constants";
import { DAY_RE, EMAIL_RE, isPeriodReversed, isValidUrl, MONTH_RE } from "./utils";

/*
 * Единственное описание структуры резюме.
 *
 * resumeSchema — схема хранения и импорта: мягкая, пустые поля допустимы, недостающее
 * заполняется значениями по умолчанию. Строгие правила (обязательные поля, формат ссылок,
 * порядок дат) — в *Rules ниже: их используют форма и расчёт прогресса.
 *
 * Порядок записей — их позиция в массиве; порядок и видимость разделов — массив sections.
 */

const text = (max: number) => z.string().max(max).default("");
const idSchema = z.string().min(1).max(64);
const imageIdSchema = z.string().max(64).nullable().default(null);
const monthSchema = z
  .string()
  .default("")
  .refine((v) => v === "" || MONTH_RE.test(v), "Формат даты: ГГГГ-ММ");
const daySchema = z
  .string()
  .default("")
  .refine((v) => v === "" || DAY_RE.test(v), "Формат даты: ГГГГ-ММ-ДД");
const tagsSchema = z.array(z.string().max(LIMITS.short)).max(LIMITS.listItems).default([]);
const hiddenSchema = z.boolean().default(false);

// ---------- разделы ----------

export const personalSchema = z.object({
  photo: imageIdSchema,
  firstName: text(LIMITS.short),
  lastName: text(LIMITS.short),
  title: text(LIMITS.short),
  city: text(LIMITS.short),
  birthDate: daySchema,
});

export const aboutSchema = z.object({
  summary: text(LIMITS.text),
});

export const experienceSchema = z.object({
  id: idSchema,
  company: text(LIMITS.short),
  position: text(LIMITS.short),
  city: text(LIMITS.short),
  startDate: monthSchema,
  endDate: monthSchema,
  current: z.boolean().default(false),
  description: text(LIMITS.text),
  achievements: z.array(z.string().max(LIMITS.medium)).max(LIMITS.listItems).default([]),
  technologies: tagsSchema,
  hidden: hiddenSchema,
});

export const skillSchema = z.object({
  id: idSchema,
  name: text(LIMITS.short),
  level: z.enum(SKILL_LEVELS).default(""),
  hidden: hiddenSchema,
});

export const educationSchema = z.object({
  id: idSchema,
  institution: text(LIMITS.medium),
  specialty: text(LIMITS.medium),
  degree: text(LIMITS.short),
  startDate: monthSchema,
  endDate: monthSchema,
  description: text(LIMITS.text),
  hidden: hiddenSchema,
});

export const courseSchema = z.object({
  id: idSchema,
  title: text(LIMITS.medium),
  organization: text(LIMITS.medium),
  date: monthSchema,
  url: text(LIMITS.url),
  description: text(LIMITS.text),
  hidden: hiddenSchema,
});

export const languageSchema = z.object({
  id: idSchema,
  language: text(LIMITS.short),
  level: z.enum(LANGUAGE_LEVELS).default("B1"),
  hidden: hiddenSchema,
});

export const socialSchema = z.object({
  id: idSchema,
  network: z.enum(SOCIAL_NETWORKS).default("github"),
  label: text(LIMITS.short), // подпись для «Другое»
  url: text(LIMITS.url),
  hidden: hiddenSchema,
});

export const contactsSchema = z.object({
  phone: text(LIMITS.short),
  email: text(LIMITS.short),
  website: text(LIMITS.url),
  socials: z.array(socialSchema).max(LIMITS.listItems).default([]),
});

export const projectLinkSchema = z.object({
  id: idSchema,
  label: text(LIMITS.short),
  url: text(LIMITS.url),
});

export const projectSchema = z.object({
  id: idSchema,
  title: text(LIMITS.medium),
  image: imageIdSchema,
  summary: text(LIMITS.medium),
  description: text(LIMITS.text),
  technologies: tagsSchema,
  url: text(LIMITS.url),
  repoUrl: text(LIMITS.url),
  links: z.array(projectLinkSchema).max(LIMITS.listItems).default([]),
  hidden: hiddenSchema,
});

export const sectionStateSchema = z.object({
  id: z.enum(SECTION_IDS),
  hidden: hiddenSchema,
});

/** Каждый раздел ровно один раз: дубли убираются, недостающие добавляются в конец. */
export function normalizeSections(sections: { id: SectionId; hidden: boolean }[]) {
  const seen = new Set<SectionId>();
  const result = sections.filter((s) => !seen.has(s.id) && seen.add(s.id));
  for (const id of SECTION_IDS) if (!seen.has(id)) result.push({ id, hidden: false });
  return result;
}

export const sectionsSchema = z
  .array(sectionStateSchema)
  .max(SECTION_IDS.length * 2)
  .default([])
  .transform(normalizeSections);

export const designSchema = z.object({
  template: z.enum(TEMPLATES).default("classic"),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #RRGGBB")
    .default(DEFAULT_ACCENT),
  font: z.enum(FONTS).default("inter"),
  density: z.enum(DENSITIES).default("standard"),
  showPhoto: z.boolean().default(true),
});

// ---------- резюме целиком ----------

export const resumeSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: idSchema,
  name: z.string().max(LIMITS.short).default("Новое резюме"),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  personal: personalSchema.prefault({}),
  about: aboutSchema.prefault({}),
  experience: z.array(experienceSchema).max(LIMITS.listItems).default([]),
  skills: z.array(skillSchema).max(LIMITS.listItems).default([]),
  education: z.array(educationSchema).max(LIMITS.listItems).default([]),
  courses: z.array(courseSchema).max(LIMITS.listItems).default([]),
  languages: z.array(languageSchema).max(LIMITS.listItems).default([]),
  contacts: contactsSchema.prefault({}),
  projects: z.array(projectSchema).max(LIMITS.listItems).default([]),
  sections: sectionsSchema,
  design: designSchema.prefault({}),
});

// ---------- строгие правила для формы и прогресса ----------

// abort: пустое поле — одна ошибка «Укажите…», без второй «неверный формат»
const required = (message: string) => z.string().default("").pipe(z.string().trim().min(1, { message, abort: true }));
const urlRule = z.string().default("").refine(isValidUrl, "Проверьте ссылку: например, https://example.com");
const emailRule = required("Укажите email").refine((v) => EMAIL_RE.test(v.trim()), "Неверный формат email");
const periodRule = (value: { startDate: string; endDate: string; current?: boolean }, ctx: z.RefinementCtx) => {
  if (!value.current && isPeriodReversed(value.startDate, value.endDate)) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "Дата окончания раньше даты начала" });
  }
};

export const personalRules = personalSchema.extend({
  firstName: required("Укажите имя"),
  lastName: required("Укажите фамилию"),
});
export const contactsRules = contactsSchema.extend({
  email: emailRule,
  website: urlRule,
  socials: z.array(socialSchema.extend({ url: urlRule })).default([]),
});
export const experienceRules = experienceSchema.superRefine(periodRule);
export const educationRules = educationSchema.superRefine(periodRule);
export const courseRules = courseSchema.extend({ url: urlRule });
export const socialRules = socialSchema.extend({ url: urlRule });
export const projectRules = projectSchema.extend({
  url: urlRule,
  repoUrl: urlRule,
  links: z.array(projectLinkSchema.extend({ url: urlRule })).default([]),
});
