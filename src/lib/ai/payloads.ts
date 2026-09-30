import { isExperienceEmpty, isProjectEmpty, isSkillEmpty, visibleItems } from "@/lib/resume/selectors";
import type { Experience, Resume } from "@/lib/resume/types";
import { formatPeriod } from "@/lib/resume/utils";
import type { AiPayload } from "./schemas";

/*
 * Минимальные данные для каждого AI-действия. В Gemini не уходят имя, фамилия, контакты,
 * дата рождения, город, фото и ссылки — только то, что нужно для текста.
 */

const experienceBrief = (e: Experience) => ({
  id: e.id,
  position: e.position.trim(),
  company: e.company.trim(),
  period: formatPeriod(e.startDate, e.endDate, e.current),
  description: e.description.trim(),
  achievements: e.achievements.map((a) => a.trim()).filter(Boolean),
  technologies: e.technologies,
});

export function profileBrief(resume: Resume): AiPayload<"strengths"> {
  return {
    title: resume.personal.title.trim(),
    experience: visibleItems(resume.experience, isExperienceEmpty).map(experienceBrief),
    skills: visibleItems(resume.skills, isSkillEmpty).map((s) => s.name.trim()),
    projects: visibleItems(resume.projects, isProjectEmpty).map((p) => ({
      title: p.title.trim(),
      summary: p.summary.trim(),
      technologies: p.technologies,
    })),
  };
}

export const aboutPayload = (resume: Resume): AiPayload<"about"> => ({
  ...profileBrief(resume),
  currentAbout: resume.about.summary.trim(),
});

/** Только одна запись опыта — остальное резюме не отправляется. */
export const experiencePayload = (e: Experience): AiPayload<"improve-experience"> => ({
  position: e.position.trim(),
  company: e.company.trim(),
  description: e.description.trim(),
  achievements: e.achievements.map((a) => a.trim()).filter(Boolean),
});

export const tailorPayload = (resume: Resume, vacancy: string): AiPayload<"tailor"> => ({
  vacancy: vacancy.trim(),
  title: resume.personal.title.trim(),
  about: resume.about.summary.trim(),
  skills: visibleItems(resume.skills, isSkillEmpty).map((s) => s.name.trim()),
  experience: visibleItems(resume.experience, isExperienceEmpty).map((e) => ({
    id: e.id,
    position: e.position.trim(),
    company: e.company.trim(),
    description: e.description.trim(),
  })),
});

/** Хватает ли данных, чтобы AI написал «О себе» без выдумок. */
export function hasProfileData(resume: Resume): boolean {
  const brief = profileBrief(resume);
  return !!brief.title || brief.experience.length > 0 || brief.skills.length > 0 || brief.projects.length > 0;
}
