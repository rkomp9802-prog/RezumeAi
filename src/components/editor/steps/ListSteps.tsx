"use client";

import { LANGUAGE_LEVEL_LABELS, SKILL_LEVEL_LABELS } from "@/lib/resume/constants";
import type { Resume } from "@/lib/resume/types";
import { formatMonth, formatPeriod } from "@/lib/resume/utils";
import { CourseForm, EducationForm, ExperienceForm, LanguageForm, ProjectForm, SkillForm } from "../item-forms";
import { ListEditor } from "../ListEditor";
import { StepHeader } from "./StepHeader";

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(" · ");

export function ExperienceStep({ resume }: { resume: Resume }) {
  return (
    <>
      <StepHeader title="Опыт работы" description="Начните с последнего места работы. Порядок меняется перетаскиванием." section="experience" />
      <ListEditor
        sectionKey="experience"
        items={resume.experience}
        title={(e) => e.position.trim() || e.company.trim() || "Новое место работы"}
        subtitle={(e) => join(e.position.trim() ? e.company : "", formatPeriod(e.startDate, e.endDate, e.current))}
        empty={{ title: "У вас пока нет опыта работы.", text: "Добавьте первую запись." }}
        addLabel="Добавить опыт"
        renderForm={(item, idPrefix) => <ExperienceForm item={item} idPrefix={idPrefix} />}
      />
    </>
  );
}

export function SkillsStep({ resume }: { resume: Resume }) {
  return (
    <>
      <StepHeader title="Навыки" description="Технологии, инструменты и умения. Уровень — по желанию." section="skills" />
      <ListEditor
        sectionKey="skills"
        items={resume.skills}
        title={(s) => s.name.trim() || "Новый навык"}
        subtitle={(s) => (s.level ? SKILL_LEVEL_LABELS[s.level] : "")}
        empty={{ title: "Навыков пока нет.", text: "Добавьте то, чем владеете: языки программирования, инструменты, методологии." }}
        addLabel="Добавить навык"
        renderForm={(item, idPrefix) => <SkillForm item={item} idPrefix={idPrefix} />}
      />
    </>
  );
}

export function EducationStep({ resume }: { resume: Resume }) {
  return (
    <>
      <StepHeader title="Образование" section="education" />
      <ListEditor
        sectionKey="education"
        items={resume.education}
        title={(e) => e.institution.trim() || e.specialty.trim() || "Новое учебное заведение"}
        subtitle={(e) => join(e.institution.trim() ? e.specialty : "", formatPeriod(e.startDate, e.endDate))}
        empty={{ title: "Образование пока не указано.", text: "Добавьте вуз, колледж или школу." }}
        addLabel="Добавить образование"
        renderForm={(item, idPrefix) => <EducationForm item={item} idPrefix={idPrefix} />}
      />
    </>
  );
}

export function CoursesStep({ resume }: { resume: Resume }) {
  return (
    <>
      <StepHeader title="Курсы и сертификаты" section="courses" />
      <ListEditor
        sectionKey="courses"
        items={resume.courses}
        title={(c) => c.title.trim() || "Новый курс"}
        subtitle={(c) => join(c.organization, formatMonth(c.date))}
        empty={{ title: "Курсов и сертификатов пока нет.", text: "Добавьте пройденные курсы — они усиливают резюме." }}
        addLabel="Добавить курс"
        renderForm={(item, idPrefix) => <CourseForm item={item} idPrefix={idPrefix} />}
      />
    </>
  );
}

export function LanguagesStep({ resume }: { resume: Resume }) {
  return (
    <>
      <StepHeader title="Языки" description="Уровни по шкале CEFR: от A1 до C2, или «Родной»." section="languages" />
      <ListEditor
        sectionKey="languages"
        items={resume.languages}
        title={(l) => l.language.trim() || "Новый язык"}
        subtitle={(l) => LANGUAGE_LEVEL_LABELS[l.level]}
        empty={{ title: "Языки пока не указаны.", text: "Добавьте языки, которыми владеете." }}
        addLabel="Добавить язык"
        renderForm={(item, idPrefix) => <LanguageForm item={item} idPrefix={idPrefix} />}
      />
    </>
  );
}

export function ProjectsStep({ resume }: { resume: Resume }) {
  return (
    <>
      <StepHeader title="Проекты" description="Изображения и подробные описания проектов показываются в портфолио." section="projects" />
      <ListEditor
        sectionKey="projects"
        items={resume.projects}
        title={(p) => p.title.trim() || "Новый проект"}
        subtitle={(p) => p.summary}
        empty={{ title: "Проектов пока нет.", text: "Добавьте проект, чтобы показать его в портфолио." }}
        addLabel="Добавить проект"
        renderForm={(item, idPrefix) => <ProjectForm item={item} idPrefix={idPrefix} />}
      />
    </>
  );
}
