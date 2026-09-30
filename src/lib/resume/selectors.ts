import {
  LANGUAGE_LEVEL_LABELS,
  SECTION_TITLES,
  SKILL_LEVEL_LABELS,
  SOCIAL_LABELS,
  type SectionId,
  type SocialNetwork,
} from "./constants";
import type { Course, Design, Education, Experience, Language, Project, Resume, Skill } from "./types";
import { displayUrl, formatDay, formatMonth, formatPeriod, hasText, normalizeUrl, phoneHref } from "./utils";

/*
 * Представление резюме для вывода. Здесь — все правила отображения:
 * порядок разделов, скрытые разделы и записи, пустые записи, форматирование дат и ссылок.
 * Предпросмотр, три шаблона, PDF, портфолио и ZIP читают только ResumeView.
 */

export type LinkView = { href: string; label: string };

export type ContactView = {
  kind: "phone" | "email" | "website" | SocialNetwork;
  title: string; // «Телефон», «GitHub»…
  label: string; // что показать
  href: string | null;
};

export type ExperienceView = {
  id: string;
  position: string;
  company: string;
  city: string;
  period: string;
  description: string;
  achievements: string[];
  technologies: string[];
};
export type SkillView = { id: string; name: string; level: string };
export type EducationView = { id: string; institution: string; specialty: string; degree: string; period: string; description: string };
export type CourseView = { id: string; title: string; organization: string; date: string; link: LinkView | null; description: string };
export type LanguageView = { id: string; language: string; level: string };
export type ProjectView = {
  id: string;
  title: string;
  imageId: string | null;
  summary: string;
  description: string;
  technologies: string[];
  links: LinkView[];
};

export type SectionView =
  | { id: "about"; title: string; text: string }
  | { id: "experience"; title: string; items: ExperienceView[] }
  | { id: "skills"; title: string; items: SkillView[] }
  | { id: "projects"; title: string; items: ProjectView[] }
  | { id: "education"; title: string; items: EducationView[] }
  | { id: "courses"; title: string; items: CourseView[] }
  | { id: "languages"; title: string; items: LanguageView[] };

export type ResumeView = {
  firstName: string;
  lastName: string;
  fullName: string;
  title: string;
  city: string;
  birthDate: string;
  photoId: string | null;
  contacts: ContactView[];
  sections: SectionView[];
  design: Design;
};

// ---------- правила «запись пустая» — общие для вывода и прогресса ----------

export const isExperienceEmpty = (e: Experience) => !hasText(e.position) && !hasText(e.company) && !hasText(e.description);
export const isSkillEmpty = (s: Skill) => !hasText(s.name);
export const isEducationEmpty = (e: Education) => !hasText(e.institution) && !hasText(e.specialty);
export const isCourseEmpty = (c: Course) => !hasText(c.title);
export const isLanguageEmpty = (l: Language) => !hasText(l.language);
export const isProjectEmpty = (p: Project) => !hasText(p.title) && !hasText(p.summary);

/** Записи, которые попадают в вывод: не скрытые и не пустые, в сохранённом порядке. */
export function visibleItems<T extends { hidden: boolean }>(items: T[], isEmpty: (item: T) => boolean): T[] {
  return items.filter((item) => !item.hidden && !isEmpty(item));
}

const link = (raw: string, label?: string): LinkView | null => {
  const href = normalizeUrl(raw);
  return href ? { href, label: label?.trim() || displayUrl(href) } : null;
};

const clean = (s: string) => s.trim();

// ---------- разделы ----------

function buildSection(resume: Resume, id: SectionId): SectionView | null {
  const title = SECTION_TITLES[id];
  switch (id) {
    case "about": {
      const text = clean(resume.about.summary);
      return text ? { id, title, text } : null;
    }
    case "experience": {
      const items = visibleItems(resume.experience, isExperienceEmpty).map((e) => ({
        id: e.id,
        position: clean(e.position),
        company: clean(e.company),
        city: clean(e.city),
        period: formatPeriod(e.startDate, e.endDate, e.current),
        description: clean(e.description),
        achievements: e.achievements.map(clean).filter(Boolean),
        technologies: e.technologies.map(clean).filter(Boolean),
      }));
      return items.length ? { id, title, items } : null;
    }
    case "skills": {
      const items = visibleItems(resume.skills, isSkillEmpty).map((s) => ({
        id: s.id,
        name: clean(s.name),
        level: s.level ? SKILL_LEVEL_LABELS[s.level] : "",
      }));
      return items.length ? { id, title, items } : null;
    }
    case "projects": {
      const items = visibleItems(resume.projects, isProjectEmpty).map((p) => ({
        id: p.id,
        title: clean(p.title),
        imageId: p.image,
        summary: clean(p.summary),
        description: clean(p.description),
        technologies: p.technologies.map(clean).filter(Boolean),
        links: [
          link(p.url, "Сайт проекта"),
          link(p.repoUrl, "Репозиторий"),
          ...p.links.map((l) => link(l.url, l.label)),
        ].filter((l): l is LinkView => l !== null),
      }));
      return items.length ? { id, title, items } : null;
    }
    case "education": {
      const items = visibleItems(resume.education, isEducationEmpty).map((e) => ({
        id: e.id,
        institution: clean(e.institution),
        specialty: clean(e.specialty),
        degree: clean(e.degree),
        period: formatPeriod(e.startDate, e.endDate),
        description: clean(e.description),
      }));
      return items.length ? { id, title, items } : null;
    }
    case "courses": {
      const items = visibleItems(resume.courses, isCourseEmpty).map((c) => ({
        id: c.id,
        title: clean(c.title),
        organization: clean(c.organization),
        date: formatMonth(c.date),
        link: link(c.url),
        description: clean(c.description),
      }));
      return items.length ? { id, title, items } : null;
    }
    case "languages": {
      const items = visibleItems(resume.languages, isLanguageEmpty).map((l) => ({
        id: l.id,
        language: clean(l.language),
        level: LANGUAGE_LEVEL_LABELS[l.level],
      }));
      return items.length ? { id, title, items } : null;
    }
  }
}

function buildContacts(resume: Resume): ContactView[] {
  const { phone, email, website, socials } = resume.contacts;
  const out: ContactView[] = [];
  if (hasText(phone)) out.push({ kind: "phone", title: "Телефон", label: phone.trim(), href: phoneHref(phone) });
  if (hasText(email)) out.push({ kind: "email", title: "Email", label: email.trim(), href: `mailto:${email.trim()}` });
  const site = link(website);
  if (site) out.push({ kind: "website", title: "Сайт", label: site.label, href: site.href });
  for (const s of socials) {
    if (s.hidden) continue;
    const l = link(s.url);
    if (!l) continue;
    const title = s.network === "other" ? s.label.trim() || "Ссылка" : SOCIAL_LABELS[s.network];
    out.push({ kind: s.network, title, label: l.label, href: l.href });
  }
  return out;
}

export function buildResumeView(resume: Resume): ResumeView {
  const { personal, design } = resume;
  const firstName = clean(personal.firstName);
  const lastName = clean(personal.lastName);
  return {
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    title: clean(personal.title),
    city: clean(personal.city),
    birthDate: formatDay(personal.birthDate),
    photoId: design.showPhoto ? personal.photo : null,
    contacts: buildContacts(resume),
    sections: resume.sections
      .filter((s) => !s.hidden)
      .map((s) => buildSection(resume, s.id))
      .filter((s): s is SectionView => s !== null),
    design,
  };
}

/** Все id изображений, на которые ссылается резюме (для экспорта и сборки мусора). */
export function collectImageIds(resume: Resume): string[] {
  return [resume.personal.photo, ...resume.projects.map((p) => p.image)].filter((id): id is string => !!id);
}
