"use client";

import type { ReactNode } from "react";
import { Controller, get, useFormState, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";
import { MonthPicker } from "@/components/common/MonthPicker";
import { TagInput } from "@/components/common/TagInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/*
 * Поля формы поверх React Hook Form и shadcn/ui: подпись, описание, ошибка Zod,
 * aria-invalid и aria-describedby — одинаково во всех шагах редактора.
 */

type BaseProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  description?: ReactNode;
  required?: boolean;
  className?: string;
  /** Уникальный префикс id, когда на экране несколько одинаковых форм (записи списка). */
  idPrefix?: string;
};

function useFieldMeta<T extends FieldValues>({ form, name, idPrefix, description }: BaseProps<T>) {
  const { errors } = useFormState({ control: form.control, name });
  const error = get(errors, name) as { message?: string } | undefined;
  const id = `${idPrefix ?? "f"}-${String(name).replace(/\./g, "-")}`;
  const describedBy = [description ? `${id}-desc` : null, error ? `${id}-err` : null].filter(Boolean).join(" ") || undefined;
  return { id, error, describedBy };
}

function Shell<T extends FieldValues>(props: BaseProps<T> & { meta: ReturnType<typeof useFieldMeta<T>>; children: ReactNode }) {
  const { label, required, description, className, meta, children } = props;
  return (
    <Field data-invalid={!!meta.error || undefined} className={className}>
      <FieldLabel htmlFor={meta.id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
        {required && <span className="sr-only">(обязательное поле)</span>}
      </FieldLabel>
      {children}
      {description && <FieldDescription id={`${meta.id}-desc`}>{description}</FieldDescription>}
      {meta.error && <FieldError id={`${meta.id}-err`} errors={[meta.error]} />}
    </Field>
  );
}

export function TextField<T extends FieldValues>(
  props: BaseProps<T> & { type?: "text" | "email" | "tel" | "url" | "date"; placeholder?: string; autoComplete?: string },
) {
  const meta = useFieldMeta(props);
  return (
    <Shell {...props} meta={meta}>
      <Input
        id={meta.id}
        type={props.type ?? "text"}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete ?? "off"}
        aria-invalid={!!meta.error || undefined}
        aria-required={props.required || undefined}
        aria-describedby={meta.describedBy}
        {...props.form.register(props.name)}
      />
    </Shell>
  );
}

export function TextAreaField<T extends FieldValues>(props: BaseProps<T> & { placeholder?: string; rows?: number }) {
  const meta = useFieldMeta(props);
  return (
    <Shell {...props} meta={meta}>
      <Textarea
        id={meta.id}
        rows={props.rows ?? 4}
        placeholder={props.placeholder}
        aria-invalid={!!meta.error || undefined}
        aria-describedby={meta.describedBy}
        className="min-h-20"
        {...props.form.register(props.name)}
      />
    </Shell>
  );
}

export function SelectField<T extends FieldValues>(props: BaseProps<T> & { options: readonly { value: string; label: string }[] }) {
  const meta = useFieldMeta(props);
  return (
    <Shell {...props} meta={meta}>
      <Controller
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          // Radix Select не принимает пустое значение — кодируем «не выбрано» отдельной меткой
          <Select value={field.value === "" ? EMPTY : field.value} onValueChange={(v) => field.onChange(v === EMPTY ? "" : v)}>
            <SelectTrigger id={meta.id} className="w-full" aria-invalid={!!meta.error || undefined} aria-describedby={meta.describedBy} onBlur={field.onBlur}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((o) => (
                <SelectItem key={o.value || EMPTY} value={o.value === "" ? EMPTY : o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Shell>
  );
}
const EMPTY = "__empty__";

export function CheckboxField<T extends FieldValues>(props: Omit<BaseProps<T>, "required">) {
  const meta = useFieldMeta(props);
  return (
    <Field orientation="horizontal" className={props.className}>
      <Controller
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          <Checkbox id={meta.id} checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} onBlur={field.onBlur} />
        )}
      />
      <FieldLabel htmlFor={meta.id} className="font-normal">
        {props.label}
      </FieldLabel>
    </Field>
  );
}

export function MonthField<T extends FieldValues>(props: BaseProps<T> & { disabled?: boolean }) {
  const meta = useFieldMeta(props);
  return (
    <Shell {...props} meta={meta}>
      <Controller
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          <MonthPicker
            id={meta.id}
            value={field.value ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            disabled={props.disabled}
            invalid={!!meta.error}
            describedBy={meta.describedBy}
          />
        )}
      />
    </Shell>
  );
}

export function TagsField<T extends FieldValues>(props: BaseProps<T> & { placeholder?: string }) {
  const meta = useFieldMeta(props);
  return (
    <Shell {...props} meta={meta}>
      <Controller
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          <TagInput
            id={meta.id}
            value={field.value ?? []}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={props.placeholder}
            describedBy={meta.describedBy}
          />
        )}
      />
    </Shell>
  );
}

/** Список строк (достижения): каждая строка — отдельный пункт. Пустые строки в вывод не попадают. */
export function LinesField<T extends FieldValues>(props: BaseProps<T> & { placeholder?: string; rows?: number }) {
  const meta = useFieldMeta(props);
  return (
    <Shell {...props} meta={meta}>
      <Controller
        control={props.form.control}
        name={props.name}
        render={({ field }) => (
          <Textarea
            id={meta.id}
            rows={props.rows ?? 3}
            placeholder={props.placeholder}
            aria-describedby={meta.describedBy}
            className="min-h-16"
            value={((field.value as string[] | undefined) ?? []).join("\n")}
            onChange={(e) => field.onChange(e.target.value.split("\n"))}
            onBlur={field.onBlur}
          />
        )}
      />
    </Shell>
  );
}
