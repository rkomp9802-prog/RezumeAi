"use client";

import { ChevronDownIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { requestAi } from "@/features/ai/client";
import { applyAboutSummary, applyExperiencePatch } from "@/features/resumes/actions";
import { getEditorState } from "@/features/resumes/store";
import { aboutPayload, experiencePayload, hasProfileData, profileBrief, tailorPayload } from "@/lib/ai/payloads";
import { TONE_LABELS, TONES, type Tone } from "@/lib/ai/schemas";
import type { Experience, Resume } from "@/lib/resume/types";
import { useAiProposal } from "./AiProposalDialog";

/*
 * Кнопки AI. Запуск — только по нажатию; результат всегда проходит через окно подтверждения.
 * Данные берутся из store в момент нажатия, так что AI видит актуальный текст.
 */

const current = () => getEditorState().resume as Resume;

function AiButton(props: { label: string; onClick: () => void; disabled?: boolean; hint?: string }) {
  const button = (
    <Button type="button" variant="outline" size="sm" onClick={props.onClick} disabled={props.disabled}>
      <SparklesIcon className="text-primary" />
      {props.label}
    </Button>
  );
  if (!props.disabled || !props.hint) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0}>{button}</span>
      </TooltipTrigger>
      <TooltipContent>{props.hint}</TooltipContent>
    </Tooltip>
  );
}

function ToneMenu({ disabled, onPick }: { disabled?: boolean; onPick: (tone: Tone) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <SparklesIcon className="text-primary" />
          Изменить тон
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Тон текста</DropdownMenuLabel>
        {TONES.map((t) => (
          <DropdownMenuItem key={t} onSelect={() => onPick(t)}>
            {TONE_LABELS[t]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------- «О себе» ----------

export function AboutAiActions({ resume }: { resume: Resume }) {
  const ai = useAiProposal();
  const [vacancyOpen, setVacancyOpen] = useState(false);
  const hasText = resume.about.summary.trim().length > 0;
  const hasData = hasProfileData(resume);
  const noDataHint = "Сначала заполните должность, опыт, навыки или проекты — AI пишет только по вашим данным";

  const textChange = (proposal: string) => [{ key: "about", label: "О себе", original: current().about.summary, proposal }];
  const applyAbout = (p: { changes: { key: string; proposal: string }[] }) => {
    const change = p.changes.find((c) => c.key === "about");
    if (change) applyAboutSummary(change.proposal);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <AiButton
        label={hasText ? "Переписать «О себе»" : "Создать «О себе»"}
        disabled={!hasData}
        hint={noDataHint}
        onClick={() =>
          ai.start({
            title: "«О себе» по вашим данным",
            run: async (signal) => {
              const { result, warnings } = await requestAi("about", aboutPayload(current()), signal);
              return { changes: textChange(result.text), warnings };
            },
            apply: applyAbout,
          })
        }
      />
      <AiButton
        label="Выделить сильные стороны"
        disabled={!hasData}
        hint={noDataHint}
        onClick={() =>
          ai.start({
            title: "Сильные стороны",
            run: async (signal) => {
              const { result, warnings } = await requestAi("strengths", profileBrief(current()), signal);
              const summary = current().about.summary.trim();
              const block = `Сильные стороны:\n${result.items.map((i) => `— ${i}`).join("\n")}`;
              return { changes: textChange(summary ? `${summary}\n\n${block}` : block), warnings };
            },
            apply: applyAbout,
          })
        }
      />
      <AiButton
        label="Исправить ошибки"
        disabled={!hasText}
        onClick={() =>
          ai.start({
            title: "Исправление ошибок",
            run: async (signal) => {
              const { result, warnings } = await requestAi("fix", { text: current().about.summary }, signal);
              return { changes: textChange(result.text), warnings };
            },
            apply: applyAbout,
          })
        }
      />
      <ToneMenu
        disabled={!hasText}
        onPick={(tone) =>
          ai.start({
            title: `Тон: ${TONE_LABELS[tone].toLowerCase()}`,
            run: async (signal) => {
              const { result, warnings } = await requestAi("tone", { text: current().about.summary, tone }, signal);
              return { changes: textChange(result.text), warnings };
            },
            apply: applyAbout,
          })
        }
      />
      <AiButton label="Адаптировать под вакансию" disabled={!hasData && !hasText} hint={noDataHint} onClick={() => setVacancyOpen(true)} />

      {vacancyOpen && (
        <VacancyDialog
          onCancel={() => setVacancyOpen(false)}
          onSubmit={(vacancy) => {
            setVacancyOpen(false);
            ai.start({
              title: "Адаптация под вакансию",
              run: async (signal) => {
                const resume = current();
                const { result, warnings } = await requestAi("tailor", tailorPayload(resume, vacancy), signal);
                const changes = [
                  { key: "about", label: "О себе", original: resume.about.summary, proposal: result.about },
                  ...result.experience.flatMap((e) => {
                    const exp = resume.experience.find((x) => x.id === e.id);
                    if (!exp) return []; // AI вернул незнакомый id — игнорируем
                    const label = `Опыт: ${[exp.position, exp.company].filter(Boolean).join(", ") || "без названия"}`;
                    return [{ key: `exp:${e.id}`, label, original: exp.description, proposal: e.description }];
                  }),
                ];
                return { changes, notes: result.notes, warnings };
              },
              apply: (proposal, selected) => {
                const chosen = proposal.changes.filter((c) => selected.has(c.key));
                const about = chosen.find((c) => c.key === "about");
                if (about) applyAboutSummary(about.proposal);
                const patches = chosen.filter((c) => c.key.startsWith("exp:")).map((c) => ({ id: c.key.slice(4), description: c.proposal }));
                if (patches.length) applyExperiencePatch(patches);
              },
            });
          }}
        />
      )}
      {ai.dialog}
    </div>
  );
}

function VacancyDialog({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (vacancy: string) => void }) {
  const [text, setText] = useState("");
  const tooShort = text.trim().length < 20;
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Адаптация под вакансию</DialogTitle>
          <DialogDescription>
            AI расставит акценты в «О себе» и описаниях опыта под требования вакансии. Новых навыков и опыта он не добавит.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vacancy-text">Текст вакансии</Label>
          <Textarea
            id="vacancy-text"
            rows={10}
            maxLength={8000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Вставьте описание вакансии: обязанности, требования, стек"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Отменить
          </Button>
          <Button disabled={tooShort} onClick={() => onSubmit(text)}>
            <SparklesIcon />
            Адаптировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- запись опыта ----------

export function ExperienceAiActions({ item }: { item: Experience }) {
  const ai = useAiProposal();
  const latest = () => current().experience.find((e) => e.id === item.id) ?? item;
  const hasText = item.description.trim().length > 0;
  const descriptionChange = (proposal: string) => [{ key: "description", label: "Описание", original: latest().description, proposal }];
  const applyDescription = (p: { changes: { key: string; proposal: string }[] }) => {
    const change = p.changes.find((c) => c.key === "description");
    if (change) applyExperiencePatch([{ id: item.id, description: change.proposal }]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <AiButton
        label="Улучшить описание"
        disabled={!hasText && item.achievements.every((a) => !a.trim())}
        hint="Сначала напишите описание или достижения своими словами"
        onClick={() =>
          ai.start({
            title: "Улучшение описания опыта",
            // Отправляется только эта запись опыта, не всё резюме
            run: async (signal) => {
              const exp = latest();
              const { result, warnings } = await requestAi("improve-experience", experiencePayload(exp), signal);
              return {
                changes: [
                  { key: "description", label: "Описание", original: exp.description, proposal: result.description },
                  {
                    key: "achievements",
                    label: "Достижения",
                    original: exp.achievements.filter((a) => a.trim()).join("\n"),
                    proposal: result.achievements.join("\n"),
                  },
                ],
                warnings,
              };
            },
            apply: (proposal, selected) => {
              const patch: { id: string; description?: string; achievements?: string[] } = { id: item.id };
              for (const c of proposal.changes) {
                if (!selected.has(c.key)) continue;
                if (c.key === "description") patch.description = c.proposal;
                if (c.key === "achievements") patch.achievements = c.proposal.split("\n").filter((l) => l.trim());
              }
              applyExperiencePatch([patch]);
            },
          })
        }
      />
      <AiButton
        label="Исправить ошибки"
        disabled={!hasText}
        onClick={() =>
          ai.start({
            title: "Исправление ошибок",
            run: async (signal) => {
              const { result, warnings } = await requestAi("fix", { text: latest().description }, signal);
              return { changes: descriptionChange(result.text), warnings };
            },
            apply: applyDescription,
          })
        }
      />
      <ToneMenu
        disabled={!hasText}
        onPick={(tone) =>
          ai.start({
            title: `Тон: ${TONE_LABELS[tone].toLowerCase()}`,
            run: async (signal) => {
              const { result, warnings } = await requestAi("tone", { text: latest().description, tone }, signal);
              return { changes: descriptionChange(result.text), warnings };
            },
            apply: applyDescription,
          })
        }
      />
      {ai.dialog}
    </div>
  );
}
