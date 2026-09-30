import type { z } from "zod";
import type { StepId } from "./constants";
import {
  contactsRules,
  courseRules,
  educationRules,
  experienceRules,
  personalRules,
  projectRules,
} from "./schema";
import type { Resume } from "./types";

/*
 * Проверка резюме строгими правилами. Та же логика, что в форме (там — через zodResolver),
 * только для всего резюме сразу: для прогресса и предупреждения перед экспортом.
 */

export type ValidationIssue = {
  step: StepId;
  path: string; // например "contacts.email" или "experience.<id>.endDate"
  message: string;
  required: boolean; // незаполненное обязательное поле
};

const REQUIRED_PATHS = new Set(["personal.firstName", "personal.lastName", "contacts.email"]);

function collect(step: StepId, prefix: string, result: z.ZodSafeParseResult<unknown>, out: ValidationIssue[]) {
  if (result.success) return;
  for (const issue of result.error.issues) {
    const path = [prefix, ...issue.path.map(String)].join(".");
    out.push({ step, path, message: issue.message, required: REQUIRED_PATHS.has(path) });
  }
}

export function validateResume(resume: Resume): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  collect("personal", "personal", personalRules.safeParse(resume.personal), out);
  collect("contacts", "contacts", contactsRules.safeParse(resume.contacts), out);
  for (const e of resume.experience) collect("experience", `experience.${e.id}`, experienceRules.safeParse(e), out);
  for (const e of resume.education) collect("education", `education.${e.id}`, educationRules.safeParse(e), out);
  for (const c of resume.courses) collect("courses", `courses.${c.id}`, courseRules.safeParse(c), out);
  for (const p of resume.projects) collect("projects", `projects.${p.id}`, projectRules.safeParse(p), out);
  return out;
}
