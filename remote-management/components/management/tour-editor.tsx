"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  TourDataSchema,
  type TourData,
  type TourMedia,
  type TourSlide,
} from "@/lib/tour-schema";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";

type FieldErrors = Map<string, string>;

function pathKey(path: ReadonlyArray<PropertyKey>): string {
  return path.join(".");
}

function collectErrors(error: z.ZodError): FieldErrors {
  const map: FieldErrors = new Map();
  for (const issue of error.issues) {
    map.set(pathKey(issue.path), issue.message);
  }
  return map;
}

const MAX_BYTES = 8 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

function makeSlug(): string {
  return `slide-${Math.random().toString(36).slice(2, 8)}`;
}

function emptySlide(): TourSlide {
  return {
    id: makeSlug(),
    title: "Untitled slide",
    displayText: "",
    spokenText: "",
    media: [],
  };
}

interface MediaEditorProps {
  media: TourMedia[];
  onChange: (next: TourMedia[]) => void;
  errors: FieldErrors;
  basePath: string;
}

function MediaEditor({ media, onChange, errors, basePath }: MediaEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const additions: TourMedia[] = [];
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          setUploadError(
            `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB — limit is 8MB`,
          );
          continue;
        }
        const dataUrl = await fileToDataUrl(file);
        const res = await fetch("/api/tour/images", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dataUrl, alt: file.name }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "upload failed" }));
          setUploadError(err.error ?? "upload failed");
          continue;
        }
        const { url } = (await res.json()) as { url: string };
        additions.push({ type: "image", url, alt: file.name });
      }
      if (additions.length > 0) {
        onChange([...media, ...additions]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Media</Label>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload images
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onChange([...media, { type: "image", url: "", alt: "" }])
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add by URL
          </Button>
        </div>
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-md bg-(--color-destructive)/10 px-3 py-2 text-xs text-(--color-destructive)">
          <AlertCircle className="h-3.5 w-3.5" />
          {uploadError}
        </div>
      )}

      {media.length === 0 && (
        <p className="rounded-md border border-dashed border-(--color-border) px-3 py-6 text-center text-xs text-(--color-muted-foreground)">
          No media yet. Upload an image or add one by URL.
        </p>
      )}

      <div className="space-y-2">
        {media.map((m, i) => {
          const urlErr = errors.get(`${basePath}.${i}.url`);
          return (
            <div
              key={`${i}-${m.url}`}
              className="flex gap-3 rounded-md border border-(--color-border) bg-(--color-background) p-3"
            >
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-(--color-muted)">
                {m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.url}
                    alt={m.alt ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-(--color-muted-foreground)" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={m.type}
                    onChange={(e) => {
                      const next = [...media];
                      next[i] = {
                        ...m,
                        type: e.target.value as TourMedia["type"],
                      };
                      onChange(next);
                    }}
                    className="h-8 rounded-md border border-(--color-border) bg-(--color-input) px-2 text-xs"
                  >
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </select>
                  <Input
                    value={m.url}
                    placeholder="URL"
                    onChange={(e) => {
                      const next = [...media];
                      next[i] = { ...m, url: e.target.value };
                      onChange(next);
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange(media.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input
                  value={m.alt ?? ""}
                  placeholder="Alt text"
                  onChange={(e) => {
                    const next = [...media];
                    next[i] = { ...m, alt: e.target.value };
                    onChange(next);
                  }}
                  className="h-8 text-xs"
                />
                {urlErr && (
                  <p className="text-xs text-(--color-destructive)">{urlErr}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SlideEditorProps {
  slide: TourSlide;
  index: number;
  total: number;
  errors: FieldErrors;
  onChange: (slide: TourSlide) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SlideEditor({
  slide,
  index,
  total,
  errors,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: SlideEditorProps) {
  const [expanded, setExpanded] = useState(index === 0);
  const base = `slides.${index}`;

  const idErr = errors.get(`${base}.id`);
  const titleErr = errors.get(`${base}.title`);
  const mediaErr = errors.get(`${base}.media`);
  const segmentsErr = errors.get(`${base}.segments`);

  const hasErrors =
    !!idErr ||
    !!titleErr ||
    !!mediaErr ||
    !!segmentsErr ||
    Array.from(errors.keys()).some((k) => k.startsWith(`${base}.`));

  return (
    <Card className={hasErrors ? "border-(--color-destructive)/50" : undefined}>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-(--color-muted-foreground)" />
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <span className="text-sm font-semibold">
              {slide.title || "(untitled)"}
            </span>
            <span className="text-xs text-(--color-muted-foreground)">
              · {slide.id}
            </span>
            {hasErrors && (
              <AlertCircle className="h-3.5 w-3.5 text-(--color-destructive)" />
            )}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-(--color-destructive)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {expanded && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${slide.id}-id`}>ID</Label>
                <Input
                  id={`${slide.id}-id`}
                  value={slide.id}
                  onChange={(e) => onChange({ ...slide, id: e.target.value })}
                />
                {idErr && (
                  <p className="text-xs text-(--color-destructive)">{idErr}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${slide.id}-title`}>Title</Label>
                <Input
                  id={`${slide.id}-title`}
                  value={slide.title}
                  onChange={(e) =>
                    onChange({ ...slide, title: e.target.value })
                  }
                />
                {titleErr && (
                  <p className="text-xs text-(--color-destructive)">{titleErr}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${slide.id}-display`}>Display text</Label>
              <Textarea
                id={`${slide.id}-display`}
                value={slide.displayText}
                rows={4}
                onChange={(e) =>
                  onChange({ ...slide, displayText: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${slide.id}-spoken`}>Spoken text</Label>
              <Textarea
                id={`${slide.id}-spoken`}
                value={slide.spokenText}
                rows={4}
                onChange={(e) =>
                  onChange({ ...slide, spokenText: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Media layout</Label>
              <select
                value={slide.mediaLayout ?? "slideshow"}
                onChange={(e) =>
                  onChange({
                    ...slide,
                    mediaLayout: e.target
                      .value as TourSlide["mediaLayout"],
                  })
                }
                className="h-9 rounded-md border border-(--color-border) bg-(--color-input) px-3 text-sm"
              >
                <option value="slideshow">slideshow</option>
                <option value="split">split (exactly 2 images)</option>
                <option value="segments">segments</option>
              </select>
            </div>

            <MediaEditor
              media={slide.media}
              onChange={(media) => onChange({ ...slide, media })}
              errors={errors}
              basePath={`${base}.media`}
            />
            {mediaErr && (
              <p className="text-xs text-(--color-destructive)">{mediaErr}</p>
            )}
            {segmentsErr && (
              <p className="text-xs text-(--color-destructive)">{segmentsErr}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TourEditor({ initial }: { initial: TourData }) {
  const [tour, setTour] = useState<TourData>(initial);
  const [original, setOriginal] = useState<TourData>(initial);
  const [errors, setErrors] = useState<FieldErrors>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(tour) !== JSON.stringify(original),
    [tour, original],
  );

  const validate = useCallback((value: TourData): FieldErrors => {
    const result = TourDataSchema.safeParse(value);
    if (result.success) return new Map();
    return collectErrors(result.error);
  }, []);

  useEffect(() => {
    setErrors(validate(tour));
  }, [tour, validate]);

  const setSlide = (i: number, slide: TourSlide) => {
    const next = { ...tour, slides: [...tour.slides] };
    next.slides[i] = slide;
    setTour(next);
  };

  const removeSlide = (i: number) => {
    setTour({ ...tour, slides: tour.slides.filter((_, idx) => idx !== i) });
  };

  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tour.slides.length) return;
    const slides = [...tour.slides];
    [slides[i], slides[j]] = [slides[j], slides[i]];
    setTour({ ...tour, slides });
  };

  const addSlide = () => {
    setTour({ ...tour, slides: [...tour.slides, emptySlide()] });
  };

  const save = async () => {
    const result = TourDataSchema.safeParse(tour);
    if (!result.success) {
      setErrors(collectErrors(result.error));
      setSaveError("Fix validation errors before saving.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/tour", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result.data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "save failed" }));
        if (err.issues) {
          const map: FieldErrors = new Map();
          for (const issue of err.issues as z.ZodIssue[]) {
            map.set(pathKey(issue.path), issue.message);
          }
          setErrors(map);
        }
        setSaveError(err.error ?? "save failed");
        return;
      }
      const data = (await res.json()) as { tour: TourData };
      setOriginal(data.tour);
      setTour(data.tour);
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  const tourNameErr = errors.get("tourName");
  const errorCount = errors.size;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-4">
          <Label htmlFor="tour-name">Tour name</Label>
          <Input
            id="tour-name"
            value={tour.tourName}
            onChange={(e) => setTour({ ...tour, tourName: e.target.value })}
          />
          {tourNameErr && (
            <p className="text-xs text-(--color-destructive)">{tourNameErr}</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {tour.slides.map((slide, i) => (
          <SlideEditor
            key={i}
            slide={slide}
            index={i}
            total={tour.slides.length}
            errors={errors}
            onChange={(s) => setSlide(i, s)}
            onRemove={() => removeSlide(i)}
            onMoveUp={() => moveSlide(i, -1)}
            onMoveDown={() => moveSlide(i, 1)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addSlide}>
        <Plus className="h-4 w-4" />
        Add slide
      </Button>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-card) p-3 shadow-lg">
        <div className="flex-1 text-xs text-(--color-muted-foreground)">
          {errorCount > 0 ? (
            <span className="flex items-center gap-1.5 text-(--color-destructive)">
              <AlertCircle className="h-3.5 w-3.5" />
              {errorCount} validation {errorCount === 1 ? "error" : "errors"}
            </span>
          ) : dirty ? (
            <span>Unsaved changes</span>
          ) : savedAt ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved at {savedAt.toLocaleTimeString()}
            </span>
          ) : (
            <span>No changes</span>
          )}
          {saveError && (
            <p className="mt-1 text-(--color-destructive)">{saveError}</p>
          )}
        </div>
        <Button
          type="button"
          onClick={save}
          disabled={saving || !dirty || errorCount > 0}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save & broadcast
        </Button>
      </div>
    </div>
  );
}
