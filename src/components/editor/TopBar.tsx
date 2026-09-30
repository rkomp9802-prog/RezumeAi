"use client";

import {
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CopyIcon,
  FilePlusIcon,
  FolderOpenIcon,
  Loader2Icon,
  PencilIcon,
  Redo2Icon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DeleteResumeDialog, duplicateWithToast, RenameDialog } from "@/components/common/ResumeDialogs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { createNewResume, redo, retrySave, switchResume, undo, useEditor } from "@/features/resumes/store";
import { STEP_TITLES, type StepId } from "@/lib/resume/constants";
import { computeProgress } from "@/lib/resume/progress";
import type { Resume, ResumeMeta } from "@/lib/resume/types";
import { cn } from "@/lib/utils";

export function TopBar({ resume, onGoTo }: { resume: Resume; onGoTo: (step: StepId) => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon" aria-label="Мои резюме">
            <Link href="/">
              <FolderOpenIcon />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Мои резюме</TooltipContent>
      </Tooltip>
      <ResumeSwitcher resume={resume} />
      <SaveStatus />
      <div className="ml-auto flex items-center gap-1">
        <UndoRedo />
        <ProgressIndicator resume={resume} onGoTo={onGoTo} />
      </div>
    </header>
  );
}

function ResumeSwitcher({ resume }: { resume: Resume }) {
  const resumes = useEditor((s) => s.resumes);
  const [dialog, setDialog] = useState<null | { type: "rename" | "delete"; meta: ResumeMeta }>(null);
  const meta = resumes.find((m) => m.id === resume.id) ?? { id: resume.id, name: resume.name, createdAt: resume.createdAt, updatedAt: resume.updatedAt };
  const sorted = useMemo(() => [...resumes].sort((a, b) => b.updatedAt - a.updatedAt), [resumes]);

  const guard = (action: () => void) => () => {
    try {
      action();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не получилось.");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="max-w-[45vw] min-w-0 gap-1 px-2 font-medium sm:max-w-72" aria-label={`Резюме «${resume.name}». Открыть меню резюме`}>
            <span className="truncate">{resume.name}</span>
            <ChevronDownIcon className="text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Резюме на этом устройстве</DropdownMenuLabel>
          <div className="max-h-64 overflow-y-auto">
            {sorted.map((m) => (
              <DropdownMenuItem key={m.id} onSelect={guard(() => switchResume(m.id))}>
                <CheckIcon className={cn(m.id === resume.id ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{m.name}</span>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={guard(() => createNewResume())}>
            <FilePlusIcon />
            Новое резюме
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog({ type: "rename", meta })}>
            <PencilIcon />
            Переименовать
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void duplicateWithToast(meta)}>
            <CopyIcon />
            Сделать копию
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ type: "delete", meta })}>
            <Trash2Icon />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog?.type === "rename" && <RenameDialog meta={dialog.meta} onClose={() => setDialog(null)} />}
      {dialog?.type === "delete" && <DeleteResumeDialog meta={dialog.meta} onClose={() => setDialog(null)} />}
    </>
  );
}

/** «Сохранение… / Сохранено / Ошибка сохранения». При ошибке данные остаются в памяти. */
function SaveStatus() {
  const save = useEditor((s) => s.save);
  if (save.status === "error") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive" aria-live="polite">
            <CircleAlertIcon />
            <span className="hidden sm:inline">Ошибка сохранения</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 text-sm">
          <p className="font-medium">Изменения не сохранились</p>
          <p className="mt-1 text-muted-foreground">{save.error}</p>
          <p className="mt-2 text-muted-foreground">Введённые данные не потеряны — они в этой вкладке.</p>
          <Button size="sm" className="mt-3" onClick={retrySave}>
            Повторить
          </Button>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <p className="hidden items-center gap-1.5 px-1 text-xs text-muted-foreground sm:flex" aria-live="polite">
      {save.status === "saving" ? (
        <>
          <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
          Сохранение…
        </>
      ) : save.status === "saved" ? (
        <>
          <CheckIcon className="size-3.5" aria-hidden />
          Сохранено
        </>
      ) : null}
    </p>
  );
}

function UndoRedo() {
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Отменить" aria-keyshortcuts="Control+Z" disabled={!canUndo} onClick={undo}>
            <Undo2Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Отменить (Ctrl+Z)</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Повторить" aria-keyshortcuts="Control+Shift+Z" disabled={!canRedo} onClick={redo}>
            <Redo2Icon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Повторить (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>
    </>
  );
}

function ProgressIndicator({ resume, onGoTo }: { resume: Resume; onGoTo: (step: StepId) => void }) {
  const progress = useMemo(() => computeProgress(resume), [resume]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="gap-2 px-2" aria-label={`Заполнено ${progress.percent}%. Показать, что осталось`}>
          <span className="hidden text-xs text-muted-foreground md:inline">Заполнено</span>
          <span className="text-sm font-medium tabular-nums">{progress.percent}%</span>
          <Progress value={progress.percent} className="hidden w-16 sm:block" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-medium">Заполнено {progress.percent}%</p>
        {progress.missing.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Резюме заполнено полностью.</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-muted-foreground">Что добавить:</p>
            <ul className="mt-2 flex flex-col gap-0.5">
              {progress.missing.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    onClick={() => onGoTo(c.step)}
                  >
                    <span>
                      {c.label}
                      {c.required && <span className="ml-1.5 text-xs text-destructive">обязательно</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{STEP_TITLES[c.step]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
