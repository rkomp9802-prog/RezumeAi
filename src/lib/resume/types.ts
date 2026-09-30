import type { z } from "zod";
import type {
  aboutSchema,
  contactsSchema,
  courseSchema,
  designSchema,
  educationSchema,
  experienceSchema,
  languageSchema,
  personalSchema,
  projectLinkSchema,
  projectSchema,
  resumeSchema,
  sectionStateSchema,
  skillSchema,
  socialSchema,
} from "./schema";

// Все типы выводятся из Zod — отдельных «ручных» интерфейсов нет

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeInput = z.input<typeof resumeSchema>;

export type Personal = z.infer<typeof personalSchema>;
export type About = z.infer<typeof aboutSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Course = z.infer<typeof courseSchema>;
export type Language = z.infer<typeof languageSchema>;
export type Social = z.infer<typeof socialSchema>;
export type Contacts = z.infer<typeof contactsSchema>;
export type ProjectLink = z.infer<typeof projectLinkSchema>;
export type Project = z.infer<typeof projectSchema>;
export type SectionState = z.infer<typeof sectionStateSchema>;
export type Design = z.infer<typeof designSchema>;

/** Разделы-списки: у каждой записи есть id и флаг hidden. */
export type ListSectionKey = "experience" | "skills" | "education" | "courses" | "languages" | "projects";
export type ListItem<K extends ListSectionKey> = Resume[K][number];

/** Краткая запись для списка резюме (хранится в индексе, чтобы не читать все резюме). */
export type ResumeMeta = Pick<Resume, "id" | "name" | "createdAt" | "updatedAt">;
