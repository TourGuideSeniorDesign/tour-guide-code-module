import { z } from "zod";

export const TourMediaTypeSchema = z.enum(["image", "video"]);

export const TourMediaSchema = z.object({
  type: TourMediaTypeSchema,
  url: z.string().min(1, "url is required"),
  alt: z.string().optional(),
});

export const TourSegmentSchema = z.object({
  displayText: z.string(),
  spokenText: z.string(),
  media: z.array(TourMediaSchema),
});

export const TourMediaLayoutSchema = z.enum(["slideshow", "split", "segments"]);

export const TourSlideSchema = z
  .object({
    id: z
      .string()
      .min(1, "id is required")
      .regex(
        /^[a-z0-9-]+$/i,
        "id may only contain letters, numbers, and dashes",
      ),
    title: z.string().min(1, "title is required"),
    displayText: z.string(),
    spokenText: z.string(),
    media: z.array(TourMediaSchema),
    mediaLayout: TourMediaLayoutSchema.optional(),
    segments: z.array(TourSegmentSchema).optional(),
  })
  .superRefine((slide, ctx) => {
    if (slide.mediaLayout === "segments") {
      if (!slide.segments || slide.segments.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["segments"],
          message: "segments are required when mediaLayout is 'segments'",
        });
      }
    }
    if (slide.mediaLayout === "split" && slide.media.length !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["media"],
        message: "split layout requires exactly 2 media items",
      });
    }
  });

export const TourDataSchema = z
  .object({
    tourName: z.string().min(1, "tourName is required"),
    slides: z.array(TourSlideSchema),
  })
  .superRefine((tour, ctx) => {
    const seen = new Set<string>();
    tour.slides.forEach((slide, i) => {
      if (seen.has(slide.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["slides", i, "id"],
          message: `duplicate slide id "${slide.id}"`,
        });
      }
      seen.add(slide.id);
    });
  });

export type TourMedia = z.infer<typeof TourMediaSchema>;
export type TourSegment = z.infer<typeof TourSegmentSchema>;
export type TourSlide = z.infer<typeof TourSlideSchema>;
export type TourData = z.infer<typeof TourDataSchema>;

const dataUrlPattern = /^data:(image\/(?:png|jpeg|jpg|gif|webp|svg\+xml));base64,([A-Za-z0-9+/=]+)$/;

export const ImageUploadSchema = z.object({
  dataUrl: z
    .string()
    .regex(
      dataUrlPattern,
      "must be a base64 data URL like data:image/png;base64,...",
    ),
  alt: z.string().optional(),
});

export type ImageUpload = z.infer<typeof ImageUploadSchema>;

export function parseDataUrl(
  dataUrl: string,
): { mime: string; ext: string; bytes: Buffer } | null {
  const match = dataUrl.match(dataUrlPattern);
  if (!match) return null;
  const mime = match[1];
  const base64 = match[2];
  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return {
    mime,
    ext: extMap[mime] ?? "bin",
    bytes: Buffer.from(base64, "base64"),
  };
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
