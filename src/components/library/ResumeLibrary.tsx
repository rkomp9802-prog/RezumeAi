"use client";

import { CopyIcon, FilePlusIcon, FileTextIcon, FileUpIcon, HardDriveIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ClearDataDialog, DeleteResumeDialog, duplicateWithToast, RenameDialog } from "@/components/common/ResumeDialogs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { importResumeFile } from "@/features/export/json";
import { createNewResume, initEditor, switchResume, useEditor } from "@/features/resumes/store";
import type { ResumeMeta } from "@/lib/resume/types";

const dateFormat = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Список резюме на этом устройстве: создать, открыть, переименовать, скопировать, удалить, импортировать. */
export function ResumeLibrary() {
  const router = useRouter();
  const status = useEditor((s) => s.status);
  const resumes = useEditor((s) => s.resumes);
  const activeId = useEditor((s) => s.resume?.id);
  const storageError = useEditor((s) => s.storageError);
  const [dialog, setDialog] = useState<null | { type: "rename" | "delete"; meta: ResumeMeta } | { type: "clear" }>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => initEditor(), []);

  const sorted = useMemo(() => [...resumes].sort((a, b) => b.updatedAt - a.updatedAt), [resumes]);

  const open = (id: string) => {
    try {
      switchResume(id);
      router.push("/editor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось открыть резюме.");
    }
  };

  const create = () => {
    try {
      createNewResume();
      router.push("/editor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось создать резюме.");
    }
  };

  const importFile = async (file: File) => {
    setImporting(true);
    try {
      await importResumeFile(file);
      toast.success("Резюме импортировано");
      router.push("/editor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось импортировать файл.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <FileTextIcon className="size-5" aria-hidden />
            <h1 className="text-lg font-semibold tracking-tight">Конструктор резюме</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing || status !== "ready"}>
              {importing ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />}
              Импорт JSON
            </Button>
            <Button onClick={create} disabled={status !== "ready"}>
              <FilePlusIcon />
              Новое резюме
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
                if (file) void importFile(file);
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <p className="flex items-start gap-3 rounded-xl border bg-background p-4 text-sm">
          <HardDriveIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span>
            <span className="font-medium">Все данные хранятся только на этом устройстве и не синхронизируются между устройствами.</span>{" "}
            <span className="text-muted-foreground">Регистрация не нужна. Чтобы перенести резюме на другой компьютер, экспортируйте его в JSON.</span>
          </span>
        </p>

        {storageError && (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            {storageError}
          </p>
        )}

        <section aria-labelledby="resumes-title">
          <h2 id="resumes-title" className="mb-3 text-sm font-medium text-muted-foreground">
            Мои резюме {status === "ready" && `· ${resumes.length}`}
          </h2>
          {status !== "ready" ? (
            <div className="flex items-center gap-3 rounded-xl border bg-background p-6 text-sm text-muted-foreground" role="status">
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
              Восстанавливаю ваши данные…
            </div>
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border bg-background">
              {sorted.map((meta) => (
                <li key={meta.id} className="flex items-center gap-2 pr-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                    onClick={() => open(meta.id)}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40" aria-hidden>
                      <FileTextIcon className="size-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{meta.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        Изменено {dateFormat.format(meta.updatedAt)}
                        {meta.id === activeId && " · открыто последним"}
                      </span>
                    </span>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Действия с резюме «${meta.name}»`}>
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => open(meta.id)}>
                        <FileTextIcon />
                        Открыть
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setDialog({ type: "rename", meta })}>
                        <PencilIcon />
                        Переименовать
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void duplicateWithToast(meta, () => router.push("/editor"))}>
                        <CopyIcon />
                        Сделать копию
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDialog({ type: "delete", meta })}>
                        <Trash2Icon />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-destructive/30 bg-background p-4" aria-labelledby="danger-title">
          <h2 id="danger-title" className="font-medium">
            Удалить все локальные данные
          </h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Удалит все резюме, настройки и изображения с этого устройства: localStorage и IndexedDB.
          </p>
          <Button variant="destructive" onClick={() => setDialog({ type: "clear" })} disabled={status !== "ready"}>
            <Trash2Icon />
            Удалить все локальные данные
          </Button>
        </section>
      </main>

      {dialog?.type === "rename" && <RenameDialog meta={dialog.meta} onClose={() => setDialog(null)} />}
      {dialog?.type === "delete" && <DeleteResumeDialog meta={dialog.meta} onClose={() => setDialog(null)} />}
      {dialog?.type === "clear" && <ClearDataDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
