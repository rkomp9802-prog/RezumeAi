"use client";

import { ArrowLeftIcon, ArrowRightIcon, CircleAlertIcon, FileTextIcon, GlobeIcon, InfoIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PortfolioPreview } from "@/components/portfolio/PortfolioPreview";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initEditor, redo, undo, useEditor } from "@/features/resumes/store";
import { STEP_IDS, STEP_TITLES, type StepId } from "@/lib/resume/constants";
import type { Resume } from "@/lib/resume/types";
import { validateResume } from "@/lib/resume/validation";
import { readPrefs, writePrefs } from "@/lib/storage/local-storage";
import { cn } from "@/lib/utils";
import { AboutStep, ContactsStep, PersonalStep } from "./steps/BasicSteps";
import { DesignStep } from "./steps/DesignStep";
import { ExportStep } from "./steps/ExportStep";
import { CoursesStep, EducationStep, ExperienceStep, LanguagesStep, ProjectsStep, SkillsStep } from "./steps/ListSteps";
import { TopBar } from "./TopBar";

type PreviewMode = "resume" | "portfolio";

/** Экран редактора: восстанавливает данные и держит layout «форма | предпросмотр». */
export function EditorApp() {
  const status = useEditor((s) => s.status);
  const resume = useEditor((s) => s.resume);
  const storageError = useEditor((s) => s.storageError);

  useEffect(() => initEditor(), []);
  useUndoShortcuts();

  if (status === "loading" || !resume) return <LoadingScreen />;
  // key: при переключении резюме формы монтируются заново с его данными
  return <Editor key={resume.id} resume={resume} storageError={storageError} />;
}

function Editor({ resume, storageError }: { resume: Resume; storageError: string | null }) {
  const [step, setStep] = useState<StepId>("personal");
  const [preview, setPreview] = useState<PreviewMode>("resume");
  const [mobilePanel, setMobilePanel] = useState<"form" | "preview">("form");

  // Последний шаг и режим предпросмотра — маленькие настройки интерфейса в localStorage
  useEffect(() => {
    const prefs = readPrefs();
    if (prefs.step && (STEP_IDS as readonly string[]).includes(prefs.step)) setStep(prefs.step as StepId);
    if (prefs.previewMode) setPreview(prefs.previewMode);
  }, []);

  const goTo = (next: StepId) => {
    setStep(next);
    setMobilePanel("form");
    writePrefs({ step: next });
    document.getElementById("form-panel")?.scrollTo({ top: 0 });
  };
  const choosePreview = (mode: PreviewMode) => {
    setPreview(mode);
    writePrefs({ previewMode: mode });
  };
  const showPortfolio = () => {
    choosePreview("portfolio");
    setMobilePanel("preview");
  };

  const issueSteps = useMemo(() => new Set(validateResume(resume).map((i) => i.step)), [resume]);
  const index = STEP_IDS.indexOf(step);

  return (
    <div className="flex h-dvh flex-col">
      <TopBar resume={resume} onGoTo={goTo} />
      {storageError && (
        <p className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-sm text-amber-900" role="alert">
          <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
          {storageError}
        </p>
      )}

      {/* Телефон и планшет: одна панель за раз */}
      <div className="flex border-b p-1.5 lg:hidden" role="tablist" aria-label="Панель">
        {(["form", "preview"] as const).map((panel) => (
          <button
            key={panel}
            type="button"
            role="tab"
            aria-selected={mobilePanel === panel}
            aria-controls={`${panel}-panel`}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium text-muted-foreground transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              mobilePanel === panel && "bg-muted text-foreground",
            )}
            onClick={() => setMobilePanel(panel)}
          >
            {panel === "form" ? "Форма" : "Предпросмотр"}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <StepNav step={step} onChange={goTo} issueSteps={issueSteps} />

        <main
          id="form-panel"
          className={cn("min-w-0 flex-1 overflow-y-auto lg:max-w-[40rem] lg:border-r", mobilePanel !== "form" && "hidden lg:block")}
          aria-label="Редактор резюме"
        >
          <div className="mx-auto flex min-h-full max-w-[40rem] flex-col px-4 pt-5 pb-6 sm:px-6">
            <StepSelect step={step} onChange={goTo} />
            <div className="flex-1">{renderStep(step, resume, goTo, showPortfolio)}</div>
            <nav className="mt-8 flex items-center justify-between gap-2 border-t pt-4" aria-label="Переход между шагами">
              <Button variant="outline" disabled={index === 0} onClick={() => goTo(STEP_IDS[index - 1])}>
                <ArrowLeftIcon />
                <span className="hidden sm:inline">{index > 0 ? STEP_TITLES[STEP_IDS[index - 1]] : "Назад"}</span>
                <span className="sm:hidden">Назад</span>
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {index + 1} / {STEP_IDS.length}
              </span>
              <Button disabled={index === STEP_IDS.length - 1} onClick={() => goTo(STEP_IDS[index + 1])}>
                <span className="hidden sm:inline">{index < STEP_IDS.length - 1 ? STEP_TITLES[STEP_IDS[index + 1]] : "Далее"}</span>
                <span className="sm:hidden">Далее</span>
                <ArrowRightIcon />
              </Button>
            </nav>
            <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
              <InfoIcon className="mt-px size-3.5 shrink-0" aria-hidden />
              Все данные хранятся только на этом устройстве и не синхронизируются между устройствами.
            </p>
          </div>
        </main>

        <section
          id="preview-panel"
          className={cn("min-w-0 flex-1 flex-col bg-canvas", mobilePanel === "preview" ? "flex" : "hidden lg:flex")}
          aria-label="Предпросмотр"
        >
          <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-1.5">
            <div className="flex gap-1" role="tablist" aria-label="Что показывать">
              <PreviewTab active={preview === "resume"} onClick={() => choosePreview("resume")} icon={<FileTextIcon />}>
                Резюме
              </PreviewTab>
              <PreviewTab active={preview === "portfolio"} onClick={() => choosePreview("portfolio")} icon={<GlobeIcon />}>
                Сайт-портфолио
              </PreviewTab>
            </div>
          </div>
          <div className="min-h-0 flex-1">{preview === "resume" ? <ResumePreview resume={resume} /> : <PortfolioPreview resume={resume} />}</div>
        </section>
      </div>
    </div>
  );
}

function renderStep(step: StepId, resume: Resume, goTo: (s: StepId) => void, showPortfolio: () => void): ReactNode {
  switch (step) {
    case "personal":
      return <PersonalStep resume={resume} />;
    case "about":
      return <AboutStep resume={resume} />;
    case "experience":
      return <ExperienceStep resume={resume} />;
    case "skills":
      return <SkillsStep resume={resume} />;
    case "education":
      return <EducationStep resume={resume} />;
    case "courses":
      return <CoursesStep resume={resume} />;
    case "languages":
      return <LanguagesStep resume={resume} />;
    case "contacts":
      return <ContactsStep resume={resume} />;
    case "projects":
      return <ProjectsStep resume={resume} />;
    case "design":
      return <DesignStep resume={resume} />;
    case "export":
      return <ExportStep resume={resume} onGoTo={goTo} onShowPortfolio={showPortfolio} />;
  }
}

function StepNav({ step, onChange, issueSteps }: { step: StepId; onChange: (s: StepId) => void; issueSteps: Set<StepId> }) {
  return (
    <nav className="hidden w-52 shrink-0 overflow-y-auto border-r bg-muted/30 p-2 xl:block" aria-label="Шаги редактора">
      <ol className="flex flex-col gap-0.5">
        {STEP_IDS.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              aria-current={id === step ? "step" : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                id === step && "bg-background font-medium text-foreground shadow-sm",
              )}
              onClick={() => onChange(id)}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums">{i + 1}</span>
              <span className="flex-1 truncate">{STEP_TITLES[id]}</span>
              {issueSteps.has(id) && <span className="size-1.5 rounded-full bg-amber-500" aria-label="есть незаполненные поля" />}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Выбор шага на экранах уже 1280px, где нет боковой навигации. */
function StepSelect({ step, onChange }: { step: StepId; onChange: (s: StepId) => void }) {
  return (
    <div className="mb-5 xl:hidden">
      <label htmlFor="step-select" className="sr-only">
        Шаг редактора
      </label>
      <Select value={step} onValueChange={(v) => onChange(v as StepId)}>
        <SelectTrigger id="step-select" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STEP_IDS.map((id, i) => (
            <SelectItem key={id} value={id}>
              {i + 1}. {STEP_TITLES[id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PreviewTab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none [&_svg]:size-4",
        active && "bg-muted font-medium text-foreground",
      )}
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

function LoadingScreen() {
  return (
    <div className="flex h-dvh flex-col" role="status" aria-label="Восстанавливаю данные">
      <div className="h-14 border-b" />
      <div className="flex flex-1 items-center justify-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" aria-hidden />
        Восстанавливаю ваши данные…
      </div>
    </div>
  );
}

/** Ctrl/Cmd+Z и Ctrl/Cmd+Shift+Z (или Ctrl+Y) вне текстовых полей — там работает обычная отмена ввода браузера. */
function useUndoShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
