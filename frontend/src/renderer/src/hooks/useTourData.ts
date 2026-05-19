import { useEffect, useRef, useState } from "react";
import { fetchTourWithVersion, waitForTourChange } from "../api/tourData";
import type { TourData } from "../types/tour";

/**
 * Loads tour content from the remote-management server and keeps it in sync
 * by long-polling the version endpoint. When the version bumps, the tour is
 * refetched and any subscribers receive the new value.
 */
export function useTourData(): TourData | null {
  const [tour, setTour] = useState<TourData | null>(null);
  const versionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();

    const load = async (): Promise<void> => {
      try {
        const { version, tour: data } = await fetchTourWithVersion();
        if (cancelled) return;
        versionRef.current = version;
        setTour(data);
      } catch (err) {
        if (!cancelled) {
          console.error("[useTourData] initial fetch failed", err);
        }
      }
    };

    const watch = async (): Promise<void> => {
      while (!cancelled) {
        try {
          const newVersion = await waitForTourChange(
            versionRef.current,
            abort.signal,
          );
          if (cancelled) return;
          if (newVersion > versionRef.current) {
            const { version, tour: data } = await fetchTourWithVersion();
            if (cancelled) return;
            versionRef.current = version;
            setTour(data);
          }
        } catch (err) {
          if (cancelled) return;
          if ((err as { name?: string }).name === "AbortError") return;
          console.warn("[useTourData] watcher error, retrying in 5s", err);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    };

    void load().then(() => {
      if (!cancelled) void watch();
    });

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, []);

  return tour;
}
