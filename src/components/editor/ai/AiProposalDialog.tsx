"use client";

import { AlertTriangleIcon, Loader2Icon, RotateCwIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/*
 * Подтверждение AI: «Исходный текст / Предложение AI», [Применить] [Отменить].
 * AI никогда не меняет текст сам — только после нажатия «Применить».
 */

export type AiChange = { key: string; label: string; original: string; proposal: string };
export type AiProposal = { changes: AiChange[]; notes?: string[]; warnings: string[] };

type Task = {
  title: string;
  run: (signal: AbortSignal) => Promise<AiProposal>;
  apply: (proposal: AiProposal, selected: Set<string>) => void;
};

type State =
  | { status: "idle" }
  | { status: "loading"; task: Task }
  | { status: "ready"; task: Task; proposal: AiProposal; selected: Set<string> }
  | { status: "error"; task: Task; error: string };

/** Состояние окна AI: start(task) — запустить действие и показать результат для подтверждения. */
export function useAiProposal() {
  const [state, setState] = useState<State>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback((task: Task) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "loading", task });
    task
      .run(controller.signal)
      .then((proposal) => {
        if (controller.signal.aborted) return;
        // Поля, где AI ничего не поменял, не показываем
        const changes = proposal.changes.filter((c) => c.proposal.trim() && c.proposal.trim() !== c.original.trim());
        setState({ status: "ready", task, proposal: { ...proposal, changes }, selected: new Set(changes.map((c) => c.key)) });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: "error", task, error: err instanceof Error ? err.message : "Не удалось получить ответ AI." });
      });
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  const dialog = <AiProposalDialog state={state} setState={setState} onClose={close} onRetry={start} />;
  return { start, dialog, busy: state.status === "loading" };
}

function AiProposalDialog({
  state,
  setState,
  onClose,
  onRetry,
}: {
  state: State;
  setState: (s: State) => void;
  onClose: () => void;
  onRetry: (task: Task) => void;
}) {
  if (state.status === "idle") return null;
  const { task } = state;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4 text-primary" aria-hidden />
            {task.title}
          </DialogTitle>
          <DialogDescription>Сравните с исходным текстом. Изменения применятся только после нажатия «Применить».</DialogDescription>
        </DialogHeader>

        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground" role="status">
            <Loader2Icon className="size-6 animate-spin" aria-hidden />
            AI готовит предложение…
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-start gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
            {state.error}
            <Button variant="outline" size="sm" onClick={() => onRetry(task)}>
              <RotateCwIcon />
              Повторить
            </Button>
          </div>
        )}

        {state.status === "ready" && (
          <div className="flex flex-col gap-4">
            {state.proposal.warnings.map((w) => (
              <p key={w} className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {w}
              </p>
            ))}
            {state.proposal.changes.length === 0 && (
              <p className="rounded-lg bg-muted p-4 text-sm">AI не нашёл, что изменить — текст уже в порядке.</p>
            )}
            {state.proposal.changes.map((c) => {
              const checked = state.selected.has(c.key);
              const multiple = state.proposal.changes.length > 1;
              return (
                <section key={c.key} className="rounded-xl border">
                  <div className="flex items-center gap-2 border-b px-4 py-2.5">
                    {multiple && (
                      <Checkbox
                        id={`ai-${c.key}`}
                        checked={checked}
                        onCheckedChange={(v) => {
                          const selected = new Set(state.selected);
                          if (v === true) selected.add(c.key);
                          else selected.delete(c.key);
                          setState({ ...state, selected });
                        }}
                      />
                    )}
                    <label htmlFor={multiple ? `ai-${c.key}` : undefined} className="text-sm font-medium">
                      {c.label}
                    </label>
                  </div>
                  <div className="grid gap-px bg-border sm:grid-cols-2">
                    <div className="bg-background p-4">
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Исходный текст</p>
                      <p className="text-sm whitespace-pre-line text-muted-foreground">{c.original || "— пусто —"}</p>
                    </div>
                    <div className="bg-background p-4">
                      <p className="mb-1.5 text-xs font-medium text-primary">Предложение AI</p>
                      <p className="text-sm whitespace-pre-line">{c.proposal}</p>
                    </div>
                  </div>
                </section>
              );
            })}
            {!!state.proposal.notes?.length && (
              <section className="rounded-xl bg-muted/60 p-4">
                <p className="mb-2 text-sm font-medium">На что сделать акцент</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {state.proposal.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отменить
          </Button>
          {state.status === "ready" && state.proposal.changes.length > 0 && (
            <Button
              disabled={state.selected.size === 0}
              onClick={() => {
                task.apply(state.proposal, state.selected);
                onClose();
              }}
            >
              Применить
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
