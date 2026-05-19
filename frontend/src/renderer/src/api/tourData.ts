import type { TourData } from "../types/tour";

const DEFAULT_URL = "http://127.0.0.1:8080";

function getBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_TOUR_API_URL;
  return (fromEnv ?? DEFAULT_URL).replace(/\/+$/, "");
}

function resolveMediaUrls(tour: TourData): TourData {
  const base = getBaseUrl();
  const fix = (url: string): string => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith("/api/tour-images/")) return `${base}${url}`;
    return url;
  };
  return {
    ...tour,
    slides: tour.slides.map((slide) => ({
      ...slide,
      media: slide.media.map((m) => ({ ...m, url: fix(m.url) })),
      segments: slide.segments?.map((seg) => ({
        ...seg,
        media: seg.media.map((m) => ({ ...m, url: fix(m.url) })),
      })),
    })),
  };
}

export interface TourFetchResult {
  version: number;
  tour: TourData;
}

export async function fetchTourData(): Promise<TourData> {
  const result = await fetchTourWithVersion();
  return result.tour;
}

export async function fetchTourWithVersion(): Promise<TourFetchResult> {
  const res = await fetch(`${getBaseUrl()}/api/tour`, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`tour fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as { version: number; tour: TourData };
  return { version: data.version, tour: resolveMediaUrls(data.tour) };
}

/** Long-polls /api/tour/wait. Resolves when the version increases past `since`. */
export async function waitForTourChange(
  since: number,
  signal?: AbortSignal,
): Promise<number> {
  const res = await fetch(
    `${getBaseUrl()}/api/tour/wait?since=${encodeURIComponent(since)}`,
    { cache: "no-store", signal },
  );
  if (!res.ok) {
    throw new Error(`wait failed: ${res.status}`);
  }
  const data = (await res.json()) as { version: number };
  return data.version;
}
