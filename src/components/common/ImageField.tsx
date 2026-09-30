"use client";

import { ImageIcon, Loader2Icon, MinusIcon, PlusIcon, RefreshCwIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { cropToBlob, ImageError, saveImage, validateImageFile } from "@/features/images/image-service";
import { useImageUrl } from "@/features/images/image-url";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  imageId: string | null;
  onChange: (imageId: string | null) => void;
  aspect: number; // ширина / высота кадра
  maxWidth: number; // итоговая ширина в пикселях
  round?: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp";

/** Загрузка, обрезка, замена и удаление изображения. Файл хранится в IndexedDB, в резюме — только id. */
export function ImageField({ label, imageId, onChange, aspect, maxWidth, round }: Props) {
  const { url, loading } = useImageUrl(imageId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null); // object URL выбранного файла для обрезки

  // Освобождаем URL исходного файла, когда окно обрезки закрыто
  useEffect(() => {
    if (!source) return;
    return () => URL.revokeObjectURL(source);
  }, [source]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    try {
      validateImageFile(file);
      setSource(URL.createObjectURL(file));
    } catch (err) {
      toast.error(err instanceof ImageError ? err.message : "Не удалось открыть файл.");
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden border bg-muted text-muted-foreground",
          round ? "size-20 rounded-full" : "h-20 w-32 rounded-lg",
        )}
      >
        {loading ? (
          <Loader2Icon className="size-5 animate-spin" aria-label="Загрузка изображения" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element -- object URL из IndexedDB
          <img src={url} alt={label} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6" aria-hidden />
        )}
      </div>
      <div className="flex flex-col items-start gap-1.5">
        <p className="text-sm font-medium">{label}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {imageId ? <RefreshCwIcon /> : <UploadIcon />}
            {imageId ? "Заменить" : "Загрузить"}
          </Button>
          {imageId && (
            <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
              <Trash2Icon />
              Удалить
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG или WebP, до 5 МБ</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label={`${label}: выбрать файл`}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = ""; // тот же файл можно выбрать снова
          }}
        />
      </div>
      {source && (
        <CropDialog
          source={source}
          aspect={aspect}
          round={round}
          title={label}
          onCancel={() => setSource(null)}
          onDone={async (area) => {
            try {
              const id = await saveImage(await cropToBlob(source, area, maxWidth));
              onChange(id);
              setSource(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Не удалось сохранить изображение.");
            }
          }}
        />
      )}
    </div>
  );
}

function CropDialog(props: {
  source: string;
  aspect: number;
  round?: boolean;
  title: string;
  onCancel: () => void;
  onDone: (area: Area) => Promise<void>;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && props.onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Обрезка: {props.title.toLowerCase()}</DialogTitle>
          <DialogDescription>Перетащите изображение и выберите масштаб. Стрелки на клавиатуре тоже двигают кадр.</DialogDescription>
        </DialogHeader>
        <div className="relative h-72 overflow-hidden rounded-lg bg-neutral-900">
          <Cropper
            image={props.source}
            crop={crop}
            zoom={zoom}
            aspect={props.aspect}
            cropShape={props.round ? "round" : "rect"}
            showGrid={!props.round}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
            keyboardStep={10}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" aria-label="Уменьшить" onClick={() => setZoom((z) => Math.max(1, z - 0.2))}>
            <MinusIcon />
          </Button>
          <Slider
            aria-label="Масштаб"
            min={1}
            max={3}
            step={0.05}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <Button variant="ghost" size="icon-sm" aria-label="Увеличить" onClick={() => setZoom((z) => Math.min(3, z + 0.2))}>
            <PlusIcon />
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={props.onCancel} disabled={saving}>
            Отменить
          </Button>
          <Button
            disabled={!area || saving}
            onClick={async () => {
              if (!area) return;
              setSaving(true);
              await props.onDone(area);
              setSaving(false);
            }}
          >
            {saving && <Loader2Icon className="animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
