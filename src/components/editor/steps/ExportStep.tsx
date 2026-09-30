"use client";

import { AlertTriangleIcon, FileDownIcon, FileJsonIcon, FileUpIcon, GlobeIcon, Loader2Icon, PackageIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportResumeJson, importResumeFile } from "@/features/export/json";
import { exportResumePdf } from "@/features/export/pdf";
import { exportPortfolioZip } from "@/features/export/zip";
import { STEP_TITLES, type StepId } from "@/lib/resume/constants";
import type { Resume } from "@/lib/resume/types";
import { validateResume } from "@/lib/resume/validation";
import { StepHeader } from "./StepHeader";

type Job = "pdf" | "json" | "import" | "zip";

export function ExportStep({ resume, onGoTo, onShowPortfolio }: { resume: Resume; onGoTo: (step: StepId) => void; onShowPortfolio: () => void }) {
  const [busy, setBusy] = useState<Job | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const issues = validateResume(resume);
  const issueSteps = [...new Set(issues.map((i) => i.step))];

  const run = async (job: Job, action: () => Promise<unknown>, success: string) => {
    setBusy(job);
    try {
      await action();
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Что-то пошло не так.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <StepHeader title="Экспорт" description="Скачайте резюме, сохраните резервную копию или соберите сайт-портфолио." />

      {issues.length > 0 && (
        <div className="mb-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Есть незаполненные или неверные поля</p>
            <p className="mt-1">
              Экспорт работает и так, но лучше проверить:{" "}
              {issueSteps.map((step, i) => (
                <span key={step}>
                  {i > 0 && ", "}
                  <button type="button" className="underline underline-offset-2 hover:no-underline" onClick={() => onGoTo(step)}>
                    {STEP_TITLES[step]}
                  </button>
                </span>
              ))}
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        <Card icon={<FileDownIcon />} title="PDF" text="Резюме в формате A4 — по выбранному шаблону, порядку разделов и настройкам дизайна.">
          <Button onClick={() => run("pdf", () => exportResumePdf(resume), "PDF готов")} disabled={busy !== null}>
            {busy === "pdf" ? <Loader2Icon className="animate-spin" /> : <FileDownIcon />}
            {busy === "pdf" ? "Создаю PDF…" : "Скачать PDF"}
          </Button>
        </Card>

        <Card
          icon={<GlobeIcon />}
          title="Сайт-портфолио"
          text="Статический мини-сайт с профилем, опытом, проектами и контактами. ZIP содержит готовый статический сайт. Чтобы получить публичную ссылку, распакуйте архив и разместите его на статическом хостинге — GitHub Pages, Netlify, Cloudflare Pages или любом веб-сервере."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onShowPortfolio}>
              <GlobeIcon />
              Открыть предпросмотр сайта
            </Button>
            <Button onClick={() => run("zip", () => exportPortfolioZip(resume), "portfolio.zip готов")} disabled={busy !== null}>
              {busy === "zip" ? <Loader2Icon className="animate-spin" /> : <PackageIcon />}
              {busy === "zip" ? "Собираю архив…" : "Скачать ZIP"}
            </Button>
          </div>
        </Card>

        <Card
          icon={<FileJsonIcon />}
          title="Резервная копия (JSON)"
          text="Файл со всеми данными резюме и изображениями. Импорт добавит резюме как новое — текущие данные не изменятся."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run("json", () => exportResumeJson(resume), "JSON сохранён")} disabled={busy !== null}>
              {busy === "json" ? <Loader2Icon className="animate-spin" /> : <FileJsonIcon />}
              Экспорт JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy === "import" ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />}
              Импорт JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-label="Выбрать JSON-файл резюме"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void run("import", () => importResumeFile(file), "Резюме импортировано и открыто");
              }}
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function Card({ icon, title, text, children }: { icon: ReactNode; title: string; text: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground [&_svg]:size-5" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{title}</h3>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">{text}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
