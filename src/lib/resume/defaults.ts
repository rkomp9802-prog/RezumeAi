import { SCHEMA_VERSION } from "./constants";
import {
  courseSchema,
  educationSchema,
  experienceSchema,
  languageSchema,
  projectLinkSchema,
  projectSchema,
  resumeSchema,
  skillSchema,
  socialSchema,
} from "./schema";
import type { ListItem, ListSectionKey, ProjectLink, Resume, Social } from "./types";
import { createId } from "./utils";

// Пустые значения получаем из самих схем — значения по умолчанию описаны в одном месте

export function createResume(name = "Новое резюме"): Resume {
  const now = Date.now();
  return resumeSchema.parse({ schemaVersion: SCHEMA_VERSION, id: createId(), name, createdAt: now, updatedAt: now });
}

const itemSchemas = {
  experience: experienceSchema,
  skills: skillSchema,
  education: educationSchema,
  courses: courseSchema,
  languages: languageSchema,
  projects: projectSchema,
} as const;

export function createListItem<K extends ListSectionKey>(key: K): ListItem<K> {
  return itemSchemas[key].parse({ id: createId() }) as ListItem<K>;
}

export const createSocial = (): Social => socialSchema.parse({ id: createId() });
export const createProjectLink = (): ProjectLink => projectLinkSchema.parse({ id: createId() });
