"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearAllData, deleteResume, duplicateResume, renameResume, switchResume } from "@/features/resumes/store";
import type { ResumeMeta } from "@/lib/resume/types";

/** Переименование резюме. */
export function RenameDialog({ meta, onClose }: { meta: ResumeMeta; onClose: () => void }) {
  const [name, setName] = useState(meta.name);
  const submit = () => {
    try {
      renameResume(meta.id, name);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось переименовать.");
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Переименовать резюме</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="resume-name">Название</Label>
            <Input id="resume-name" value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} />
            <p className="text-xs text-muted-foreground">Видно только вам — в списке резюме. В PDF не попадает.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отменить
            </Button>
            <Button type="submit">Сохранить</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Подтверждение удаления резюме — действие нельзя отменить. */
export function DeleteResumeDialog({ meta, onClose }: { meta: ResumeMeta; onClose: () => void }) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить «{meta.name}»?</AlertDialogTitle>
          <AlertDialogDescription>Резюме и его изображения будут удалены с этого устройства. Это нельзя отменить — при необходимости сначала экспортируйте его в JSON.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отменить</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              try {
                deleteResume(meta.id);
                toast.success("Резюме удалено");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Не удалось удалить.");
              }
            }}
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Подтверждение удаления всех локальных данных. */
export function ClearDataDialog({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить все локальные данные?</AlertDialogTitle>
          <AlertDialogDescription>
            Будут удалены все резюме, настройки и изображения на этом устройстве (localStorage и IndexedDB). Восстановить их будет нельзя — сохраните
            нужные резюме в JSON заранее.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Отменить</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await clearAllData();
                toast.success("Все локальные данные удалены");
                onDone?.();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Не удалось удалить данные.");
              } finally {
                setBusy(false);
                onClose();
              }
            }}
          >
            {busy ? "Удаляю…" : "Удалить всё"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Копия резюме со своими изображениями; предлагает сразу открыть копию. */
export async function duplicateWithToast(meta: ResumeMeta, onOpen?: (id: string) => void) {
  try {
    const id = await duplicateResume(meta.id);
    toast.success(`Создана копия «${meta.name}»`, {
      action: {
        label: "Открыть",
        onClick: () => {
          switchResume(id);
          onOpen?.(id);
        },
      },
    });
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Не удалось скопировать.");
  }
}
