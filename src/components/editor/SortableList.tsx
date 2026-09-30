"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props<T extends { id: string }> = {
  items: T[];
  onMove: (from: number, to: number) => void;
  /** Подпись записи для экранного диктора: «Опыт: Frontend-разработчик». */
  describe: (item: T) => string;
  children: (item: T, handle: ReactNode, index: number) => ReactNode;
};

// Подсказки для экранного диктора — на русском
const instructions = {
  draggable:
    "Чтобы переместить запись, нажмите пробел или Enter, стрелками вверх и вниз выберите место и снова нажмите пробел. Escape — отмена.",
};

/**
 * Список с перетаскиванием (dnd-kit). Мышь, касание и клавиатура: ручка — отдельная кнопка,
 * поэтому поля внутри записи не мешают перетаскиванию.
 */
export function SortableList<T extends { id: string }>({ items, onMove, describe, children }: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const name = (id: string | number) => {
    const item = items.find((i) => i.id === id);
    return item ? describe(item) : "запись";
  };
  const position = (id: string | number) => items.findIndex((i) => i.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Взята запись «${name(active.id)}», позиция ${position(active.id)} из ${items.length}.`,
    onDragOver: ({ active, over }) => (over ? `«${name(active.id)}» над позицией ${position(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `«${name(active.id)}» перемещена на позицию ${position(over.id)}.` : undefined),
    onDragCancel: ({ active }) => `Перемещение «${name(active.id)}» отменено.`,
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onMove(
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{ announcements, screenReaderInstructions: instructions }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <SortableRow key={item.id} id={item.id} label={describe(item)}>
              {(handle) => children(item, handle, index)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, label, children }: { id: string; label: string; children: (handle: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
      aria-label={`Переместить: ${label}`}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-90 shadow-lg")}
    >
      {children(handle)}
    </li>
  );
}
