import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { TourDataSchema, type TourData } from "./tour-schema";

const DATA_DIR = process.env.TOUR_DATA_DIR
  ? path.resolve(process.env.TOUR_DATA_DIR)
  : path.resolve(process.cwd(), "data");

const TOUR_FILE = path.join(DATA_DIR, "tour.json");
const VERSION_FILE = path.join(DATA_DIR, "tour.version");
const IMAGES_DIR = path.join(DATA_DIR, "tour-images");

const DEFAULT_TOUR: TourData = {
  tourName: "Lafayette College — ECE, 4th Floor (Acopian Engineering Center)",
  slides: [
    {
      id: "welcome",
      title: "Standard Tour Start",
      displayText:
        "Welcome to the fourth floor of Acopian Engineering Center, home to the Electrical and Computer Engineering major at Lafayette.",
      spokenText:
        "Welcome to the fourth floor of Acopian Engineering Center, home to the Electrical and Computer Engineering major at Lafayette.",
      mediaLayout: "split",
      media: [
        {
          type: "image",
          url: "/tour-images/lafayette-acopian-facade.jpg",
          alt: "Acopian Engineering Center exterior",
        },
        {
          type: "image",
          url: "/tour-images/lafayette-aec-fourth-floor-directory.jpg",
          alt: "Fourth floor directory, Acopian Engineering Center",
        },
      ],
    },
  ],
};

type WaitResolver = (version: number) => void;
const waiters = new Set<{ since: number; resolve: WaitResolver }>();

async function ensureDirs(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(IMAGES_DIR, { recursive: true });
}

async function ensureInitialized(): Promise<void> {
  await ensureDirs();
  if (!existsSync(TOUR_FILE)) {
    await fs.writeFile(TOUR_FILE, JSON.stringify(DEFAULT_TOUR, null, 2));
  }
  if (!existsSync(VERSION_FILE)) {
    await fs.writeFile(VERSION_FILE, "1");
  }
}

export async function readTour(): Promise<TourData> {
  await ensureInitialized();
  const raw = await fs.readFile(TOUR_FILE, "utf-8");
  const parsed = TourDataSchema.parse(JSON.parse(raw));
  return parsed;
}

export async function readVersion(): Promise<number> {
  await ensureInitialized();
  const raw = await fs.readFile(VERSION_FILE, "utf-8");
  const v = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(v) ? v : 1;
}

export async function writeTour(data: TourData): Promise<number> {
  await ensureInitialized();
  const validated = TourDataSchema.parse(data);
  const tmp = `${TOUR_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(validated, null, 2));
  await fs.rename(tmp, TOUR_FILE);

  const current = await readVersion();
  const next = current + 1;
  const vtmp = `${VERSION_FILE}.tmp`;
  await fs.writeFile(vtmp, String(next));
  await fs.rename(vtmp, VERSION_FILE);

  // Wake any pollers waiting for a newer version.
  for (const w of waiters) {
    if (next > w.since) {
      waiters.delete(w);
      w.resolve(next);
    }
  }

  // Garbage-collect unreferenced images.
  void pruneOrphanImages(validated).catch(() => {
    /* best-effort */
  });

  return next;
}

export async function storeImage(
  bytes: Buffer,
  ext: string,
): Promise<{ filename: string; url: string }> {
  await ensureInitialized();
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  const filename = `${hash}.${ext}`;
  const target = path.join(IMAGES_DIR, filename);
  if (!existsSync(target)) {
    await fs.writeFile(target, bytes);
  }
  return { filename, url: `/api/tour-images/${filename}` };
}

export async function readImage(
  filename: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  // prevent path traversal
  if (filename.includes("/") || filename.includes("..") || filename.includes("\\")) {
    return null;
  }
  const target = path.join(IMAGES_DIR, filename);
  if (!existsSync(target)) return null;
  const bytes = await fs.readFile(target);
  const ext = path.extname(filename).slice(1).toLowerCase();
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
  };
  return { bytes, mime: mimeMap[ext] ?? "application/octet-stream" };
}

async function pruneOrphanImages(tour: TourData): Promise<void> {
  const referenced = new Set<string>();
  const collect = (url: string): void => {
    const prefix = "/api/tour-images/";
    if (url.startsWith(prefix)) referenced.add(url.slice(prefix.length));
  };
  for (const slide of tour.slides) {
    for (const m of slide.media) collect(m.url);
    for (const seg of slide.segments ?? []) {
      for (const m of seg.media) collect(m.url);
    }
  }
  const entries = await fs.readdir(IMAGES_DIR);
  await Promise.all(
    entries.map(async (name) => {
      if (!referenced.has(name)) {
        await fs.unlink(path.join(IMAGES_DIR, name)).catch(() => undefined);
      }
    }),
  );
}

/**
 * Long-poll for a version newer than `since`. Resolves immediately if the
 * current version is already newer, otherwise resolves when writeTour fires
 * or the timeout expires (returning the current version either way).
 */
export async function waitForVersionChange(
  since: number,
  timeoutMs: number,
): Promise<number> {
  const current = await readVersion();
  if (current > since) return current;
  return new Promise<number>((resolve) => {
    const waiter = { since, resolve };
    waiters.add(waiter);
    setTimeout(() => {
      if (waiters.has(waiter)) {
        waiters.delete(waiter);
        readVersion().then(resolve);
      }
    }, timeoutMs);
  });
}
