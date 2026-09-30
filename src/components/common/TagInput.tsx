"use client";

import { XIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { splitTags } from "@/lib/resume/utils";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  placeholder?: string;
  describedBy?: string;
};

/** Поле тегов: Enter или запятая добавляют тег, Backspace в пустом поле удаляет последний. */
export function TagInput({ id, value, onChange, onBlur, placeholder, describedBy }: Props) {
  const [text, setText] = useState("");

  const commit = (raw: string) => {
    const tags = splitTags(raw).filter((t) => !value.includes(t));
    if (tags.length) onChange([...value, ...tags]);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && text.trim()) {
      e.preventDefault();
      commit(text);
    } else if (e.key === "Backspace" && !text && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input px-1.5 py-1 text-sm transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
      )}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-muted py-0.5 pr-0.5 pl-2 text-xs">
          {tag}
          <button
            type="button"
            className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Удалить «${tag}»`}
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            <XIcon className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="h-6 min-w-24 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
        value={text}
        placeholder={value.length ? "" : placeholder}
        aria-describedby={describedBy}
        onChange={(e) => {
          // Вставка «React, Next.js, TypeScript» сразу превращается в теги
          if (/[,;\n]/.test(e.target.value)) commit(e.target.value);
          else setText(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (text.trim()) commit(text);
          onBlur?.();
        }}
      />
    </div>
  );
}
