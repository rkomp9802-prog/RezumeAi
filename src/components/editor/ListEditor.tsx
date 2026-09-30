"use client";

import { ChevronDownIcon, EyeIcon, EyeOffIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { addItem, moveItem, removeItem, toggleItemHidden } from "@/features/resumes/actions";
import { getEditorState, undo } from "@/features/resumes/store";
import type { ListItem, ListSectionKey } from "@/lib/resume/types";
import { cn } from "@/lib/utils";
import { SortableList } from "./SortableList";

type Props<K extends ListSectionKey> = {
  sectionKey: K;
  items: ListItem<K>[];
  title: (item: ListItem<K>) => string;
  subtitle?: (item: ListItem<K>) => string;
  empty: { title: string; text: string };
  addLabel: string;
  renderForm: (item: ListItem<K>, idPrefix: string) => ReactNode;
};

/** Редактор раздела-списка: добавить, изменить, удалить, скрыть, показать, изменить порядок. */
export function ListEditor<K extends ListSectionKey>({ sectionKey, items, title, subtitle, empty, addLabel, renderForm }: Props<K>) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.length === 1 ? [items[0].id] : []));

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = () => {
    const id = addItem(sectionKey);
    setExpanded((prev) => new Set(prev).add(id));
    // Фокус на первое поле новой записи — можно сразу печатать
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#item-${id} input, #item-${id} textarea`)?.focus());
  };

  const remove = (item: ListItem<K>) => {
    removeItem(sectionKey, item.id);
    const afterDelete = getEditorState().resume;
    toast(`Удалено: ${title(item)}`, {
      action: {
        label: "Отменить",
        // Отменяем, только если после удаления ничего не менялось — иначе undo откатит другое изменение
        onClick: () => (getEditorState().resume === afterDelete ? undo() : toast.info("Используйте кнопку «Отменить» в верхней панели")),
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center">
          <p className="font-medium">{empty.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{empty.text}</p>
          <Button className="mt-4" onClick={add}>
            <PlusIcon />
            {addLabel}
          </Button>
        </div>
      ) : (
        <>
          <SortableList items={items} onMove={(from, to) => moveItem(sectionKey, from, to)} describe={title}>
            {(item, handle) => {
              const open = expanded.has(item.id);
              const sub = subtitle?.(item);
              return (
                <div className={cn("rounded-xl border bg-card", item.hidden && "bg-muted/40")}>
                  <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
                    {handle}
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      aria-expanded={open}
                      aria-controls={`item-${item.id}`}
                      onClick={() => toggle(item.id)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate text-sm font-medium", item.hidden && "text-muted-foreground")}>{title(item)}</span>
                        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
                      </span>
                      {item.hidden && <Badge variant="secondary">Скрыто</Badge>}
                      <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-pressed={item.hidden}
                          aria-label={item.hidden ? `Показать в резюме: ${title(item)}` : `Скрыть из резюме: ${title(item)}`}
                          onClick={() => toggleItemHidden(sectionKey, item.id)}
                        >
                          {item.hidden ? <EyeOffIcon /> : <EyeIcon />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{item.hidden ? "Показать в резюме" : "Скрыть из резюме"}</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Удалить: ${title(item)}`} onClick={() => remove(item)}>
                          <Trash2Icon />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Удалить</TooltipContent>
                    </Tooltip>
                  </div>
                  <div id={`item-${item.id}`} hidden={!open} className="border-t px-4 pt-4 pb-5">
                    {open && renderForm(item, `item-${item.id}`)}
                  </div>
                </div>
              );
            }}
          </SortableList>
          <Button variant="outline" className="self-start" onClick={add}>
            <PlusIcon />
            {addLabel}
          </Button>
        </>
      )}
    </div>
  );
}
