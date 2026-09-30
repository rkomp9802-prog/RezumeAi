"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { Controller, get, useFormState } from "react-hook-form";
import { ImageField } from "@/components/common/ImageField";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setProjectImage, updateItem } from "@/features/resumes/actions";
import { LANGUAGE_LEVEL_LABELS, LANGUAGE_LEVELS, SKILL_LEVEL_LABELS, SKILL_LEVELS } from "@/lib/resume/constants";
import { createProjectLink } from "@/lib/resume/defaults";
import { courseRules, educationRules, experienceRules, projectRules } from "@/lib/resume/schema";
import { languageSchema, skillSchema } from "@/lib/resume/schema";
import type { Course, Education, Experience, Language, Project, ProjectLink, Skill } from "@/lib/resume/types";
import { CheckboxField, LinesField, MonthField, SelectField, TagsField, TextAreaField, TextField } from "./form/fields";
import { useSyncedForm } from "./form/use-synced-form";
import { ExperienceAiActions } from "./ai/AiActions";

const grid = "grid gap-4 sm:grid-cols-2";

export function ExperienceForm({ item, idPrefix }: { item: Experience; idPrefix: string }) {
  const form = useSyncedForm({
    schema: experienceRules,
    values: item,
    onValues: (v, field) => updateItem("experience", item.id, v, field),
  });
  const current = form.watch("current");
  const p = { form, idPrefix };
  return (
    <FieldGroup className="gap-4">
      <div className={grid}>
        <TextField {...p} name="position" label="Должность" placeholder="Frontend-разработчик" />
        <TextField {...p} name="company" label="Компания" placeholder="ООО «Ромашка»" />
      </div>
      <TextField {...p} name="city" label="Город" placeholder="Ташкент" />
      <div className={grid}>
        <MonthField {...p} name="startDate" label="Начало" />
        <MonthField {...p} name="endDate" label="Окончание" disabled={current} />
      </div>
      <CheckboxField {...p} name="current" label="Работаю сейчас" />
      <TextAreaField {...p} name="description" label="Описание" rows={4} placeholder="Чем занимались, за что отвечали" />
      <ExperienceAiActions item={item} />
      <LinesField
        {...p}
        name="achievements"
        label="Достижения"
        description="Каждое достижение — с новой строки"
        placeholder={"Сократил время сборки на 40%\nЗапустил новый раздел сайта"}
      />
      <TagsField {...p} name="technologies" label="Технологии" placeholder="React, TypeScript…" description="Enter или запятая — добавить" />
    </FieldGroup>
  );
}

export function SkillForm({ item, idPrefix }: { item: Skill; idPrefix: string }) {
  const form = useSyncedForm({
    schema: skillSchema,
    values: item,
    onValues: (v, field) => updateItem("skills", item.id, v, field),
  });
  return (
    <div className={grid}>
      <TextField form={form} idPrefix={idPrefix} name="name" label="Навык" placeholder="TypeScript" />
      <SelectField
        form={form}
        idPrefix={idPrefix}
        name="level"
        label="Уровень"
        options={SKILL_LEVELS.map((l) => ({ value: l, label: SKILL_LEVEL_LABELS[l] }))}
      />
    </div>
  );
}

export function EducationForm({ item, idPrefix }: { item: Education; idPrefix: string }) {
  const form = useSyncedForm({
    schema: educationRules,
    values: item,
    onValues: (v, field) => updateItem("education", item.id, v, field),
  });
  const p = { form, idPrefix };
  return (
    <FieldGroup className="gap-4">
      <TextField {...p} name="institution" label="Учебное заведение" placeholder="ТУИТ" />
      <div className={grid}>
        <TextField {...p} name="specialty" label="Специальность" placeholder="Программная инженерия" />
        <TextField {...p} name="degree" label="Степень / квалификация" placeholder="Бакалавр" />
      </div>
      <div className={grid}>
        <MonthField {...p} name="startDate" label="Начало" />
        <MonthField {...p} name="endDate" label="Окончание" />
      </div>
      <TextAreaField {...p} name="description" label="Описание" rows={3} />
    </FieldGroup>
  );
}

export function CourseForm({ item, idPrefix }: { item: Course; idPrefix: string }) {
  const form = useSyncedForm({
    schema: courseRules,
    values: item,
    onValues: (v, field) => updateItem("courses", item.id, v, field),
  });
  const p = { form, idPrefix };
  return (
    <FieldGroup className="gap-4">
      <div className={grid}>
        <TextField {...p} name="title" label="Название" placeholder="AI-разработчик" />
        <TextField {...p} name="organization" label="Организация" placeholder="PROWEB" />
      </div>
      <div className={grid}>
        <MonthField {...p} name="date" label="Дата" />
        <TextField {...p} name="url" label="Ссылка на сертификат" type="url" placeholder="https://…" />
      </div>
      <TextAreaField {...p} name="description" label="Описание" rows={3} />
    </FieldGroup>
  );
}

export function LanguageForm({ item, idPrefix }: { item: Language; idPrefix: string }) {
  const form = useSyncedForm({
    schema: languageSchema,
    values: item,
    onValues: (v, field) => updateItem("languages", item.id, v, field),
  });
  return (
    <div className={grid}>
      <TextField form={form} idPrefix={idPrefix} name="language" label="Язык" placeholder="Английский" />
      <SelectField
        form={form}
        idPrefix={idPrefix}
        name="level"
        label="Уровень"
        options={LANGUAGE_LEVELS.map((l) => ({ value: l, label: LANGUAGE_LEVEL_LABELS[l] }))}
      />
    </div>
  );
}

export function ProjectForm({ item, idPrefix }: { item: Project; idPrefix: string }) {
  const form = useSyncedForm({
    schema: projectRules,
    values: item,
    onValues: (v, field) => updateItem("projects", item.id, v, field),
  });
  const p = { form, idPrefix };
  return (
    <FieldGroup className="gap-4">
      <TextField {...p} name="title" label="Название" placeholder="Интернет-магазин кофе" />
      <ImageField
        label="Изображение проекта"
        imageId={item.image}
        onChange={(id) => setProjectImage(item.id, id)}
        aspect={16 / 10}
        maxWidth={1200}
      />
      <TextField {...p} name="summary" label="Краткое описание" placeholder="Одной фразой — что это и для кого" />
      <TextAreaField {...p} name="description" label="Подробное описание" rows={4} description="Показывается в портфолио" />
      <TagsField {...p} name="technologies" label="Технологии" placeholder="Next.js, Tailwind…" />
      <div className={grid}>
        <TextField {...p} name="url" label="Ссылка на проект" type="url" placeholder="https://…" />
        <TextField {...p} name="repoUrl" label="Репозиторий" type="url" placeholder="https://github.com/…" />
      </div>
      <ProjectLinks form={form} idPrefix={idPrefix} />
    </FieldGroup>
  );
}

function ProjectLinks({ form, idPrefix }: { form: ReturnType<typeof useSyncedForm<Project>>; idPrefix: string }) {
  const { errors } = useFormState({ control: form.control, name: "links" });
  return (
    <Controller
      control={form.control}
      name="links"
      render={({ field }) => {
        const links = field.value as ProjectLink[];
        const set = (next: ProjectLink[]) => field.onChange(next);
        return (
          <FieldSet className="gap-2">
            <FieldLegend variant="label">Дополнительные ссылки</FieldLegend>
            {links.map((link, i) => {
              const error = get(errors, `links.${i}.url`) as { message?: string } | undefined;
              return (
                <div key={link.id} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <FieldLabel htmlFor={`${idPrefix}-link-${link.id}-label`} className="sr-only">
                      Подпись ссылки {i + 1}
                    </FieldLabel>
                    <Input
                      id={`${idPrefix}-link-${link.id}-label`}
                      className="w-1/3"
                      placeholder="Подпись"
                      value={link.label}
                      onChange={(e) => set(links.map((l) => (l.id === link.id ? { ...l, label: e.target.value } : l)))}
                    />
                    <FieldLabel htmlFor={`${idPrefix}-link-${link.id}-url`} className="sr-only">
                      Адрес ссылки {i + 1}
                    </FieldLabel>
                    <Input
                      id={`${idPrefix}-link-${link.id}-url`}
                      type="url"
                      className="flex-1"
                      placeholder="https://…"
                      aria-invalid={!!error || undefined}
                      value={link.url}
                      onChange={(e) => set(links.map((l) => (l.id === link.id ? { ...l, url: e.target.value } : l)))}
                      onBlur={() => void form.trigger(`links.${i}.url`)}
                    />
                    <Button variant="ghost" size="icon" aria-label={`Удалить ссылку ${link.label || i + 1}`} onClick={() => set(links.filter((l) => l.id !== link.id))}>
                      <XIcon />
                    </Button>
                  </div>
                  {error && <FieldError errors={[error]} />}
                </div>
              );
            })}
            <Button variant="outline" size="sm" className="self-start" onClick={() => set([...links, createProjectLink()])}>
              <PlusIcon />
              Добавить ссылку
            </Button>
          </FieldSet>
        );
      }}
    />
  );
}
