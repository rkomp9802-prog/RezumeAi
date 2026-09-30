import type { StepId } from "./constants";
import {
  isCourseEmpty,
  isEducationEmpty,
  isExperienceEmpty,
  isLanguageEmpty,
  isProjectEmpty,
  isSkillEmpty,
  visibleItems,
} from "./selectors";
import type { Resume } from "./types";
import { hasText } from "./utils";
import { validateResume } from "./validation";

/*
 * Прогресс заполнения — единственное место расчёта. Обязательные поля весят больше:
 * без имени, фамилии и email резюме не может быть заполнено больше чем на ~65%.
 */

export type ProgressCheck = {
  id: string;
  label: string;
  step: StepId;
  weight: number;
  done: boolean;
  required: boolean;
};

export type Progress = {
  percent: number;
  checks: ProgressCheck[];
  missing: ProgressCheck[]; // незавершённые, сначала обязательные
};

const REQUIRED_WEIGHT = 4;

export function computeProgress(resume: Resume): Progress {
  const issues = new Set(validateResume(resume).map((i) => i.path));
  const ok = (path: string) => !issues.has(path);

  const checks: ProgressCheck[] = [
    { id: "firstName", label: "Имя", step: "personal", weight: REQUIRED_WEIGHT, required: true, done: ok("personal.firstName") },
    { id: "lastName", label: "Фамилия", step: "personal", weight: REQUIRED_WEIGHT, required: true, done: ok("personal.lastName") },
    { id: "email", label: "Email", step: "contacts", weight: REQUIRED_WEIGHT, required: true, done: ok("contacts.email") },
    { id: "title", label: "Должность", step: "personal", weight: 1, required: false, done: hasText(resume.personal.title) },
    { id: "city", label: "Город", step: "personal", weight: 1, required: false, done: hasText(resume.personal.city) },
    { id: "photo", label: "Фотография", step: "personal", weight: 1, required: false, done: !!resume.personal.photo },
    { id: "about", label: "Текст «О себе»", step: "about", weight: 2, required: false, done: resume.about.summary.trim().length >= 60 },
    {
      id: "experience",
      label: "Опыт работы",
      step: "experience",
      weight: 3,
      required: false,
      done: visibleItems(resume.experience, isExperienceEmpty).length > 0,
    },
    { id: "skills", label: "Не меньше трёх навыков", step: "skills", weight: 2, required: false, done: visibleItems(resume.skills, isSkillEmpty).length >= 3 },
    { id: "education", label: "Образование", step: "education", weight: 2, required: false, done: visibleItems(resume.education, isEducationEmpty).length > 0 },
    { id: "courses", label: "Курсы или сертификаты", step: "courses", weight: 1, required: false, done: visibleItems(resume.courses, isCourseEmpty).length > 0 },
    { id: "languages", label: "Языки", step: "languages", weight: 1, required: false, done: visibleItems(resume.languages, isLanguageEmpty).length > 0 },
    {
      id: "contacts",
      label: "Телефон, сайт или соцсеть",
      step: "contacts",
      weight: 1,
      required: false,
      done: hasText(resume.contacts.phone) || hasText(resume.contacts.website) || resume.contacts.socials.some((s) => hasText(s.url)),
    },
    { id: "projects", label: "Проекты", step: "projects", weight: 2, required: false, done: visibleItems(resume.projects, isProjectEmpty).length > 0 },
  ];

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const done = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);
  const missing = checks.filter((c) => !c.done).sort((a, b) => Number(b.required) - Number(a.required));
  return { percent: Math.round((done / total) * 100), checks, missing };
}
