"use client";

import { EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, get, useFormState } from "react-hook-form";
import { ImageField } from "@/components/common/ImageField";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setPhoto, updateObject } from "@/features/resumes/actions";
import { SOCIAL_LABELS, SOCIAL_NETWORKS, type SocialNetwork } from "@/lib/resume/constants";
import { createSocial } from "@/lib/resume/defaults";
import { contactsRules, personalRules, aboutSchema } from "@/lib/resume/schema";
import type { Resume, Social } from "@/lib/resume/types";
import { arrayMove } from "@/features/resumes/actions";
import { cn } from "@/lib/utils";
import { AboutAiActions } from "../ai/AiActions";
import { TextAreaField, TextField } from "../form/fields";
import { useSyncedForm } from "../form/use-synced-form";
import { SortableList } from "../SortableList";
import { StepHeader } from "./StepHeader";

const grid = "grid gap-4 sm:grid-cols-2";

export function PersonalStep({ resume }: { resume: Resume }) {
  const form = useSyncedForm({
    schema: personalRules,
    values: resume.personal,
    onValues: (v, field) => updateObject("personal", v, field),
  });
  const p = { form };
  return (
    <>
      <StepHeader title="Основная информация" description="Имя и фамилия обязательны. Остальное — по желанию." />
      <FieldGroup className="gap-5">
        <ImageField label="Фотография" imageId={resume.personal.photo} onChange={setPhoto} aspect={1} maxWidth={600} round />
        <div className={grid}>
          <TextField {...p} name="firstName" label="Имя" required autoComplete="given-name" placeholder="Иван" />
          <TextField {...p} name="lastName" label="Фамилия" required autoComplete="family-name" placeholder="Петров" />
        </div>
        <TextField {...p} name="title" label="Должность" placeholder="Frontend-разработчик" autoComplete="organization-title" />
        <div className={grid}>
          <TextField {...p} name="city" label="Город" placeholder="Ташкент" autoComplete="address-level2" />
          <TextField {...p} name="birthDate" label="Дата рождения" type="date" autoComplete="bday" />
        </div>
      </FieldGroup>
    </>
  );
}

export function AboutStep({ resume }: { resume: Resume }) {
  const form = useSyncedForm({
    schema: aboutSchema,
    values: resume.about,
    onValues: (v, field) => updateObject("about", v, field),
  });
  return (
    <>
      <StepHeader title="О себе" description="Коротко: кто вы, в чём сильны и что ищете." section="about" />
      <FieldGroup className="gap-4">
        <TextAreaField
          form={form}
          name="summary"
          label="Текст «О себе»"
          rows={8}
          placeholder="Frontend-разработчик с опытом 3 года. Делаю быстрые интерфейсы на React и TypeScript…"
        />
        <div>
          <p className="mb-2 text-sm font-medium">AI-помощник</p>
          <AboutAiActions resume={resume} />
          <p className="mt-2 text-xs text-muted-foreground">
            AI использует только ваши данные и ничего не меняет без подтверждения. В Gemini не отправляются имя, контакты и фото.
          </p>
        </div>
      </FieldGroup>
    </>
  );
}

export function ContactsStep({ resume }: { resume: Resume }) {
  const form = useSyncedForm({
    schema: contactsRules,
    values: resume.contacts,
    onValues: (v, field) => updateObject("contacts", v, field),
  });
  const p = { form };
  return (
    <>
      <StepHeader title="Контакты" description="Email обязателен — по нему с вами свяжутся." />
      <FieldGroup className="gap-5">
        <div className={grid}>
          <TextField {...p} name="email" label="Email" type="email" required autoComplete="email" placeholder="ivan@mail.ru" />
          <TextField {...p} name="phone" label="Телефон" type="tel" autoComplete="tel" placeholder="+998 90 123-45-67" />
        </div>
        <TextField {...p} name="website" label="Сайт" type="url" autoComplete="url" placeholder="https://ivan.dev" />
        <SocialsEditor form={form} />
      </FieldGroup>
    </>
  );
}

type ContactsForm = ReturnType<typeof useSyncedForm<Resume["contacts"]>>;

/** Соцсети — расширяемый список: выбор сети, ссылка, скрытие, порядок. */
function SocialsEditor({ form }: { form: ContactsForm }) {
  const { errors } = useFormState({ control: form.control, name: "socials" });
  return (
    <Controller
      control={form.control}
      name="socials"
      render={({ field }) => {
        const socials = field.value as Social[];
        const set = (next: Social[]) => field.onChange(next);
        const patch = (id: string, values: Partial<Social>) => set(socials.map((s) => (s.id === id ? { ...s, ...values } : s)));
        const title = (s: Social) => (s.network === "other" ? s.label || "Ссылка" : SOCIAL_LABELS[s.network]);
        return (
          <FieldSet className="gap-3">
            <FieldLegend variant="label">Соцсети и профили</FieldLegend>
            {socials.length === 0 && <p className="text-sm text-muted-foreground">Добавьте GitHub, LinkedIn, Telegram или другой профиль.</p>}
            {socials.length > 0 && (
              <SortableList items={socials} onMove={(from, to) => set(arrayMove(socials, from, to))} describe={title}>
                {(s, handle, i) => {
                  const error = get(errors, `socials.${i}.url`) as { message?: string } | undefined;
                  return (
                    <div className={cn("rounded-xl border p-2", s.hidden && "bg-muted/40")}>
                      <div className="flex flex-wrap items-center gap-2">
                        {handle}
                        <Label htmlFor={`social-${s.id}-network`} className="sr-only">
                          Соцсеть
                        </Label>
                        <Select value={s.network} onValueChange={(v) => patch(s.id, { network: v as SocialNetwork })}>
                          <SelectTrigger id={`social-${s.id}-network`} className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_NETWORKS.map((n) => (
                              <SelectItem key={n} value={n}>
                                {SOCIAL_LABELS[n]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {s.network === "other" && (
                          <>
                            <Label htmlFor={`social-${s.id}-label`} className="sr-only">
                              Название
                            </Label>
                            <Input
                              id={`social-${s.id}-label`}
                              className="w-32"
                              placeholder="Название"
                              value={s.label}
                              onChange={(e) => patch(s.id, { label: e.target.value })}
                            />
                          </>
                        )}
                        <Label htmlFor={`social-${s.id}-url`} className="sr-only">
                          Ссылка на {title(s)}
                        </Label>
                        <Input
                          id={`social-${s.id}-url`}
                          type="url"
                          className="min-w-40 flex-1"
                          placeholder="https://…"
                          value={s.url}
                          aria-invalid={!!error || undefined}
                          onChange={(e) => patch(s.id, { url: e.target.value })}
                          onBlur={() => void form.trigger(`socials.${i}.url`)}
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-pressed={s.hidden}
                          aria-label={s.hidden ? `Показать: ${title(s)}` : `Скрыть: ${title(s)}`}
                          onClick={() => patch(s.id, { hidden: !s.hidden })}
                        >
                          {s.hidden ? <EyeOffIcon /> : <EyeIcon />}
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Удалить: ${title(s)}`} onClick={() => set(socials.filter((x) => x.id !== s.id))}>
                          <Trash2Icon />
                        </Button>
                      </div>
                      {error && <FieldError className="mt-1 pl-9" errors={[error]} />}
                    </div>
                  );
                }}
              </SortableList>
            )}
            <Button variant="outline" size="sm" className="self-start" onClick={() => set([...socials, createSocial()])}>
              <PlusIcon />
              Добавить соцсеть
            </Button>
          </FieldSet>
        );
      }}
    />
  );
}
