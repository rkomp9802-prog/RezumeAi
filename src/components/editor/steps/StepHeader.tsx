"use client";

import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { setSectionHidden } from "@/features/resumes/actions";
import { useEditor } from "@/features/resumes/store";
import { SECTION_TITLES, type SectionId } from "@/lib/resume/constants";

export function StepHeader({ title, description, section }: { title: string; description?: ReactNode; section?: SectionId }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {section && <SectionToggle id={section} />}
    </header>
  );
}

/** Показывать или скрывать весь раздел — действует на предпросмотр, PDF, портфолио и ZIP. */
export function SectionToggle({ id }: { id: SectionId }) {
  const hidden = useEditor((s) => s.resume?.sections.find((x) => x.id === id)?.hidden ?? false);
  return (
    <div className="flex items-center gap-2">
      <Switch id={`section-${id}`} checked={!hidden} onCheckedChange={(on) => setSectionHidden(id, !on)} />
      <Label htmlFor={`section-${id}`} className="text-sm font-normal text-muted-foreground">
        Показывать «{SECTION_TITLES[id]}»
      </Label>
    </div>
  );
}
