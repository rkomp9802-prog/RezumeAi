"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useForm, type DefaultValues, type FieldValues, type Resolver, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { useEditor } from "@/features/resumes/store";

/*
 * React Hook Form поверх единого store.
 * - Ввод пользователя сразу пишется в store (onValues), быстрый набор в одно поле склеивается в один шаг undo.
 * - Внешние изменения (undo/redo, AI, импорт) сбрасывают форму к актуальным данным store.
 * - Zod-правила показывают ошибки у полей; черновые (невалидные) значения всё равно сохраняются.
 */
export function useSyncedForm<T extends FieldValues>(options: {
  /** Строгие правила (например, experienceRules). Тип формы берётся из values — данных резюме. */
  schema: z.ZodType<unknown, FieldValues>;
  values: T;
  onValues: (values: T, changedField: string) => void;
}): UseFormReturn<T> {
  const { schema, values, onValues } = options;
  const externalRevision = useEditor((s) => s.externalRevision);

  const form = useForm<T>({
    // Выход схемы по форме совпадает с T (это те же данные резюме, только проверенные),
    // но TypeScript не выводит это из обобщённого типа — поэтому явное приведение
    resolver: zodResolver(schema) as unknown as Resolver<T>,
    defaultValues: values as DefaultValues<T>,
    mode: "onTouched",
  });

  // Актуальные values и onValues для эффектов ниже (обновляем после рендера, не во время)
  const latest = useRef({ values, onValues });
  useEffect(() => {
    latest.current = { values, onValues };
  });

  // Сброс к данным store при внешнем изменении. Первый рендер пропускаем
  const seenRevision = useRef(externalRevision);
  useEffect(() => {
    if (seenRevision.current === externalRevision) return;
    seenRevision.current = externalRevision;
    form.reset(latest.current.values, { keepErrors: false, keepTouched: true });
  }, [externalRevision, form]);

  useEffect(() => {
    const subscription = form.watch((all, { name, type }) => {
      if (type === "change" && name) latest.current.onValues(all as T, name);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return form;
}
