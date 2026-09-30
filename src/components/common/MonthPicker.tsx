"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const selectClass =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive";

type Props = {
  id: string;
  value: string; // "YYYY-MM" или ""
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * Выбор месяца и года двумя обычными списками: работает одинаково во всех браузерах
 * (input type="month" есть не везде) и полностью доступен с клавиатуры.
 */
export function MonthPicker({ id, value, onChange, onBlur, disabled, invalid, describedBy }: Props) {
  const [year, month] = value ? value.split("-") : ["", ""];
  // Неполный выбор (только месяц или только год) держим локально, в данные уходит полная дата
  const [draft, setDraft] = useState({ year, month });
  const current = value ? { year, month } : draft;

  const years: number[] = [];
  const now = new Date().getFullYear();
  for (let y = now + 6; y >= 1960; y--) years.push(y);

  const update = (next: { year: string; month: string }) => {
    setDraft(next);
    onChange(next.year && next.month ? `${next.year}-${next.month}` : "");
  };

  return (
    <div className="flex gap-2" onBlur={onBlur}>
      <select
        id={id}
        aria-label="Месяц"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(selectClass, "flex-[3]")}
        value={current.month}
        disabled={disabled}
        onChange={(e) => update({ ...current, month: e.target.value })}
      >
        <option value="">Месяц</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={String(i + 1).padStart(2, "0")}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="Год"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(selectClass, "flex-[2]")}
        value={current.year}
        disabled={disabled}
        onChange={(e) => update({ ...current, year: e.target.value })}
      >
        <option value="">Год</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
