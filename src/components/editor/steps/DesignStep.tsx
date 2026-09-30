"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { moveSection, setSectionHidden, updateDesign } from "@/features/resumes/actions";
import {
  ACCENT_PRESETS,
  DENSITIES,
  DENSITY_LABELS,
  FONT_INFO,
  FONTS,
  SECTION_TITLES,
  TEMPLATE_INFO,
  TEMPLATES,
  type Density,
  type TemplateId,
} from "@/lib/resume/constants";
import { fontStack } from "@/lib/resume/design";
import type { Resume } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { SortableList } from "../SortableList";
import { StepHeader } from "./StepHeader";

const cardRadio =
  "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50";

export function DesignStep({ resume }: { resume: Resume }) {
  const { design } = resume;
  return (
    <>
      <StepHeader title="Дизайн" description="Все настройки сразу видны в предпросмотре и одинаково применяются к PDF и портфолио." />
      <div className="flex flex-col gap-7">
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Шаблон</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <label key={t} className={cardRadio}>
                <input
                  type="radio"
                  name="template"
                  value={t}
                  className="sr-only"
                  checked={design.template === t}
                  onChange={() => updateDesign({ template: t })}
                />
                <TemplateThumb template={t} accent={design.accent} />
                <span className="text-sm font-medium">{TEMPLATE_INFO[t].label}</span>
                <span className="text-xs text-muted-foreground">{TEMPLATE_INFO[t].description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <AccentPicker value={design.accent} />

        <fieldset>
          <legend className="mb-3 text-sm font-medium">Шрифт</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FONTS.map((f) => (
              <label key={f} className={cn(cardRadio, "flex-row items-center justify-between")}>
                <input type="radio" name="font" value={f} className="sr-only" checked={design.font === f} onChange={() => updateDesign({ font: f })} />
                <span>
                  <span className="block text-base" style={{ fontFamily: fontStack(f) }}>
                    Иван Петров
                  </span>
                  <span className="text-xs text-muted-foreground">{FONT_INFO[f].label}</span>
                </span>
                {design.font === f && <CheckIcon className="size-4 text-primary" aria-hidden />}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
          <div>
            <p id="density-label" className="mb-3 text-sm font-medium">
              Плотность
            </p>
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="density-label"
              value={design.density}
              onValueChange={(v) => v && updateDesign({ density: v as Density })}
            >
              {DENSITIES.map((d) => (
                <ToggleGroupItem key={d} value={d} className="px-3">
                  {DENSITY_LABELS[d]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2 pb-1.5">
            <Switch id="show-photo" checked={design.showPhoto} onCheckedChange={(v) => updateDesign({ showPhoto: v })} />
            <Label htmlFor="show-photo" className="font-normal">
              Показывать фотографию
            </Label>
          </div>
        </div>

        <Separator />

        <section>
          <h3 className="text-sm font-medium">Порядок и видимость разделов</h3>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Перетащите разделы, чтобы изменить порядок. Порядок и скрытие действуют на предпросмотр, PDF, портфолио и ZIP.
          </p>
          <SortableList items={resume.sections} onMove={moveSection} describe={(s) => SECTION_TITLES[s.id]}>
            {(s, handle) => (
              <div className={cn("flex items-center gap-2 rounded-xl border py-1.5 pr-3 pl-1", s.hidden && "bg-muted/40")}>
                {handle}
                <Label htmlFor={`order-${s.id}`} className={cn("flex-1 font-normal", s.hidden && "text-muted-foreground")}>
                  {SECTION_TITLES[s.id]}
                </Label>
                <span className="text-xs text-muted-foreground">{s.hidden ? "скрыт" : "показан"}</span>
                <Switch id={`order-${s.id}`} checked={!s.hidden} onCheckedChange={(on) => setSectionHidden(s.id, !on)} />
              </div>
            )}
          </SortableList>
        </section>
      </div>
    </>
  );
}

function AccentPicker({ value }: { value: string }) {
  const [custom, setCustom] = useState(value);
  const isPreset = ACCENT_PRESETS.some((p) => p.value === value);
  const commitCustom = (hex: string) => {
    setCustom(hex);
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) updateDesign({ accent: hex.toLowerCase() });
  };
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium">Цветовой акцент</legend>
      <div className="flex flex-wrap items-center gap-2">
        {ACCENT_PRESETS.map((p) => (
          <label
            key={p.value}
            title={p.label}
            className="relative flex size-8 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
            style={{ background: p.value }}
          >
            <input
              type="radio"
              name="accent"
              value={p.value}
              className="sr-only"
              aria-label={p.label}
              checked={value === p.value}
              onChange={() => {
                setCustom(p.value);
                updateDesign({ accent: p.value });
              }}
            />
            {value === p.value && <CheckIcon className="size-4 text-white" aria-hidden />}
          </label>
        ))}
        <div className="ml-2 flex items-center gap-2">
          <Label htmlFor="accent-custom" className="text-sm font-normal text-muted-foreground">
            Свой цвет
          </Label>
          <input
            id="accent-custom"
            type="color"
            className={cn("size-8 cursor-pointer rounded-md border bg-transparent p-0.5", !isPreset && "ring-2 ring-primary")}
            value={value}
            onChange={(e) => commitCustom(e.target.value)}
          />
          <Input
            aria-label="Цвет в формате HEX"
            className="w-24 font-mono text-xs"
            value={custom}
            maxLength={7}
            onChange={(e) => commitCustom(e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`)}
          />
        </div>
      </div>
    </fieldset>
  );
}

/** Схематичный эскиз шаблона — чтобы выбирать глазами, а не по названию. */
function TemplateThumb({ template, accent }: { template: TemplateId; accent: string }) {
  const line = (w: string, className = "") => <span className={cn("block h-1 rounded-full bg-neutral-300", className)} style={{ width: w }} />;
  return (
    <span aria-hidden className="block aspect-[210/150] overflow-hidden rounded-md border bg-white p-2">
      {template === "classic" && (
        <span className="flex flex-col gap-1">
          <span className="flex items-start justify-between">
            <span className="flex flex-col gap-1">
              <span className="block h-1.5 w-14 rounded-full bg-neutral-700" />
              <span className="block h-1 w-10 rounded-full" style={{ background: accent }} />
            </span>
            <span className="block size-5 rounded-sm bg-neutral-200" />
          </span>
          <span className="my-0.5 block h-px" style={{ background: accent }} />
          {line("40%", "bg-neutral-400")}
          {line("90%")}
          {line("80%")}
          {line("35%", "bg-neutral-400 mt-1")}
          {line("85%")}
        </span>
      )}
      {template === "minimal" && (
        <span className="flex flex-col gap-1.5 p-1">
          <span className="flex items-center gap-1.5">
            <span className="block size-4 rounded-full bg-neutral-200" />
            <span className="block h-1.5 w-16 rounded-full bg-neutral-600" />
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="grid grid-cols-[22%_1fr] gap-1.5">
              {line("80%", "bg-neutral-200")}
              <span className="flex flex-col gap-1">
                {line("90%")}
                {line("70%")}
              </span>
            </span>
          ))}
        </span>
      )}
      {template === "modern" && (
        <span className="grid h-full grid-cols-[34%_1fr] gap-1.5">
          <span className="flex flex-col items-center gap-1 rounded-sm p-1" style={{ background: `${accent}22` }}>
            <span className="block size-5 rounded-full bg-white" />
            {line("80%", "bg-white")}
            {line("60%", "bg-white")}
          </span>
          <span className="flex flex-col gap-1 pt-0.5">
            <span className="block h-1.5 w-14 rounded-full" style={{ background: accent }} />
            {line("90%")}
            {line("80%")}
            {line("85%")}
          </span>
        </span>
      )}
    </span>
  );
}
