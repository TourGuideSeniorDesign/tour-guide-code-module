import {
  Bug,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Mic,
  Volume2,
  VolumeX,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchTourData } from "./api/tourData";
import { useRosBridge } from "./hooks/useRosBridge";
import { useVapi } from "./hooks/useVapi";
import type { TourData, TourMedia, TourSegment } from "./types/tour";

function MediaItem({ item }: { item: TourMedia }): React.JSX.Element {
  if (item.type === "image") {
    return (
      <img
        src={item.url}
        alt={item.alt ?? ""}
        className="w-full h-full object-cover transition-opacity duration-700"
        key={item.url}
      />
    );
  }
  return (
    <video
      src={item.url}
      className="w-full h-full object-cover"
      autoPlay
      muted
      loop
      key={item.url}
    />
  );
}

function MediaCarousel({ media }: { media: TourMedia[] }): React.JSX.Element {
  const [active, setActive] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on media change
  useEffect(() => {
    setActive(0);
  }, [media]);

  useEffect(() => {
    if (media.length <= 1) return;
    const id = setInterval(
      () => setActive((i) => (i + 1) % media.length),
      5000,
    );
    return () => clearInterval(id);
  }, [media]);

  const item = media[active];
  if (!item) return <div />;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-black/5">
      <MediaItem item={item} />

      {media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((m, i) => (
            <button
              type="button"
              key={m.url}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Show media ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaSplit({ media }: { media: TourMedia[] }): React.JSX.Element {
  const left = media[0];
  const right = media[1];

  if (!left) return <div />;
  if (!right) {
    return (
      <div className="w-full h-full overflow-hidden rounded-xl bg-black/5">
        <MediaItem item={left} />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full gap-2.5">
      <div className="h-1/2 w-full overflow-hidden rounded-xl bg-black/5">
        <MediaItem item={left} />
      </div>
      <div className="h-1/2 w-full overflow-hidden rounded-xl bg-black/5">
        <MediaItem item={right} />
      </div>
    </div>
  );
}

function MediaDisplay({
  media,
  layout,
}: {
  media: TourMedia[];
  layout: "slideshow" | "split" | "segments";
}): React.JSX.Element {
  if (layout === "split" && media.length >= 2) {
    return <MediaSplit media={media} />;
  }
  return <MediaCarousel media={media} />;
}

function SegmentedSlide({
  title,
  segments,
  speaking,
  autoSpeak,
  voiceEnabled,
  onPlayNarration,
  onToggleAuto,
}: {
  title: string;
  segments: TourSegment[];
  speaking: boolean;
  autoSpeak: boolean;
  voiceEnabled: boolean;
  onPlayNarration: () => void;
  onToggleAuto: () => void;
}): React.JSX.Element {
  const allMedia = segments.flatMap((s) => s.media);

  return (
    <div className="flex-1 flex min-h-0">
      <div className="w-1/2 p-5 flex items-center">
        {allMedia.length > 0 ? (
          <MediaCarousel media={allMedia} />
        ) : (
          <div className="w-full h-full rounded-xl bg-black/5" />
        )}
      </div>

      <div className="w-1/2 flex flex-col justify-center p-8 pr-10">
        <h2 className="text-2xl font-bold text-(--color-foreground) leading-tight mb-4">
          {title}
        </h2>

        <div className="flex flex-col gap-4">
          {segments.map((seg) => (
            <div
              key={seg.displayText.slice(0, 30)}
              className="rounded-lg px-4 py-3 border-l-2 border-l-transparent"
            >
              <p className="text-base text-muted-foreground leading-relaxed">
                {seg.displayText}
              </p>
            </div>
          ))}
        </div>

        <VapiControls
          speaking={speaking}
          autoSpeak={autoSpeak}
          voiceEnabled={voiceEnabled}
          onPlay={onPlayNarration}
          onToggleAuto={onToggleAuto}
        />
      </div>
    </div>
  );
}

function VapiControls({
  speaking,
  autoSpeak,
  voiceEnabled,
  onPlay,
  onToggleAuto,
}: {
  speaking: boolean;
  autoSpeak: boolean;
  voiceEnabled: boolean;
  onPlay: () => void;
  onToggleAuto: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 mt-6">
      <button
        type="button"
        onClick={onPlay}
        disabled={speaking || !voiceEnabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary)/20 transition-colors disabled:opacity-40"
      >
        <Volume2 className="h-3.5 w-3.5" />
        {!voiceEnabled
          ? "Start voice tour first"
          : speaking
            ? "Speaking…"
            : "Play narration"}
      </button>

      <button
        type="button"
        onClick={onToggleAuto}
        className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          autoSpeak
            ? "bg-(--color-accent) text-(--color-accent-foreground)"
            : "bg-transparent text-muted-foreground hover:bg-(--color-accent)"
        }`}
        title={autoSpeak ? "Auto-narration on" : "Auto-narration off"}
      >
        {autoSpeak ? (
          <Volume2 className="h-3.5 w-3.5" />
        ) : (
          <VolumeX className="h-3.5 w-3.5" />
        )}
        Auto
      </button>
    </div>
  );
}

export default function SecondaryWindow(): React.JSX.Element {
  const [tour, setTour] = useState<TourData | null>(null);
  const [current, setCurrent] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [debug, setDebug] = useState(false);
  const [voiceStartModalOpen, setVoiceStartModalOpen] = useState(false);
  const [voiceSessionMode, setVoiceSessionMode] = useState<
    "20min" | "unlimited" | null
  >(null);
  const voiceTimeoutRef = useRef<number | null>(null);
  const wasCallActiveRef = useRef(false);
  const lastTourSignalRef = useRef<string | null>(null);
  const { topics } = useRosBridge();
  const {
    speaking,
    narrating,
    callActive,
    volumeLevel,
    transcript,
    error: vapiError,
    startCall,
    stopCall,
    sayNarration,
    updateSlideContext,
  } = useVapi();

  useEffect(() => {
    fetchTourData().then(setTour);
  }, []);

  const slide = tour?.slides[current];
  const total = tour?.slides.length ?? 0;
  const slideIndexById = useMemo(
    () =>
      new Map(
        (tour?.slides ?? []).map((tourSlide, index) => [tourSlide.id, index]),
      ),
    [tour],
  );

  const goTo = useCallback(
    (index: number) => {
      setCurrent(index);
    },
    [],
  );

  const prev = useCallback(
    () => goTo((current - 1 + total) % total),
    [current, total, goTo],
  );

  const next = useCallback(
    () => goTo((current + 1) % total),
    [current, total, goTo],
  );

  const clearVoiceTimeout = useCallback(() => {
    if (voiceTimeoutRef.current !== null) {
      window.clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
  }, []);

  const startVoiceTour = useCallback(
    (mode: "20min" | "unlimited") => {
      if (!tour) return;
      clearVoiceTimeout();
      setVoiceStartModalOpen(false);
      setVoiceSessionMode(mode);
      startCall(tour.slides, current);

      if (mode === "20min") {
        voiceTimeoutRef.current = window.setTimeout(
          () => {
            stopCall();
            setVoiceSessionMode(null);
            voiceTimeoutRef.current = null;
          },
          20 * 60 * 1000,
        );
      }
    },
    [tour, current, startCall, stopCall, clearVoiceTimeout],
  );

  const endVoiceTour = useCallback(() => {
    clearVoiceTimeout();
    setVoiceSessionMode(null);
    stopCall();
  }, [clearVoiceTimeout, stopCall]);

  useEffect(() => clearVoiceTimeout, [clearVoiceTimeout]);

  useEffect(() => {
    if (callActive) {
      wasCallActiveRef.current = true;
      return;
    }

    if (wasCallActiveRef.current && voiceSessionMode) {
      clearVoiceTimeout();
      setVoiceSessionMode(null);
    }
    wasCallActiveRef.current = false;
  }, [callActive, voiceSessionMode, clearVoiceTimeout]);

  useEffect(() => {
    if (!vapiError || !voiceSessionMode) return;
    clearVoiceTimeout();
    setVoiceSessionMode(null);
  }, [vapiError, voiceSessionMode, clearVoiceTimeout]);

  // Narrate + update context on slide change
  useEffect(() => {
    if (!tour || !slide || !callActive || !autoSpeak) return;
    updateSlideContext(tour.slides, current);
    const text =
      slide.mediaLayout === "segments" && slide.segments?.length
        ? slide.segments.map((seg) => seg.spokenText).join(" ")
        : slide.spokenText;
    sayNarration(text);
  }, [slide, autoSpeak, callActive, tour, current, updateSlideContext, sayNarration]);

  useEffect(() => {
    const message = topics.tourControl;
    if (!message || !tour) return;

    const signalKey = message.slide_id;
    if (signalKey === lastTourSignalRef.current) return;
    lastTourSignalRef.current = signalKey;

    const nextIndex = slideIndexById.get(message.slide_id);
    if (nextIndex === undefined) return;

    // ROS drives slide navigation; the narrate+context effect handles VAPI
    goTo(nextIndex);
  }, [topics.tourControl, tour, slideIndexById, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "d" || e.key === "D") {
        setDebug((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (!tour || !slide) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-(--color-background)">
        <Loader2 className="h-8 w-8 animate-spin text-(--color-primary)" />
      </div>
    );
  }

  const progress = ((current + 1) / total) * 100;

  return (
    <div className="flex flex-col h-screen bg-(--color-background) select-none overflow-hidden">
      {/* Title bar drag region */}
      <div
        className="h-8 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      />

      {/* Progress bar */}
      <div className="h-1 bg-(--color-border) shrink-0">
        <div
          className="h-full bg-(--color-primary) transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tour header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-(--color-border) shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-(--color-primary)" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {tour.tourName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={callActive ? endVoiceTour : () => setVoiceStartModalOpen(true)}
            disabled={!callActive && !!vapiError}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ${
              callActive
                ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                : "bg-(--color-primary) text-(--color-primary-foreground) hover:opacity-90"
            }`}
            title={
              callActive
                ? "End the active voice tour"
                : "Choose a 20-minute or unlimited voice session"
            }
          >
            <Mic className="h-3.5 w-3.5" />
            {callActive
              ? `End Voice Tour${
                  voiceSessionMode === "20min"
                    ? " (20 min)"
                    : voiceSessionMode === "unlimited"
                      ? " (Unlimited)"
                      : ""
                }`
              : "Start Voice Tour"}
          </button>
          <button
            type="button"
            onClick={() => setDebug((v) => !v)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-colors ${
              debug
                ? "bg-amber-500/15 text-amber-600"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
            title="Toggle debug panel (D)"
          >
            <Bug className="h-3 w-3" />
            {debug && "DEBUG"}
          </button>
          <span className="text-xs font-mono text-muted-foreground">
            {current + 1} / {total}
          </span>
        </div>
      </div>

      {voiceStartModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-md rounded-2xl border border-(--color-border) bg-(--color-background) p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-(--color-foreground)">
              Start Voice Tour
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Choose how long the Vapi voice call should stay active. The
              20-minute option will automatically end the call.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => startVoiceTour("20min")}
                className="flex-1 rounded-lg bg-(--color-primary) px-4 py-3 text-sm font-medium text-(--color-primary-foreground) hover:opacity-90"
              >
                Start Voice Tour — 20 min
              </button>
              <button
                type="button"
                onClick={() => startVoiceTour("unlimited")}
                className="flex-1 rounded-lg border border-(--color-border) px-4 py-3 text-sm font-medium text-(--color-foreground) hover:bg-(--color-accent)"
              >
                Start Unlimited
              </button>
            </div>
            <button
              type="button"
              onClick={() => setVoiceStartModalOpen(false)}
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-(--color-accent)"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {slide.mediaLayout === "segments" && slide.segments?.length ? (
        <SegmentedSlide
          title={slide.title}
          segments={slide.segments}
          speaking={speaking}
          autoSpeak={autoSpeak}
          voiceEnabled={callActive}
          onPlayNarration={() =>
            sayNarration(
              (slide.segments ?? []).map((seg) => seg.spokenText).join(" "),
            )
          }
          onToggleAuto={() => setAutoSpeak((v) => !v)}
        />
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Left: media */}
          <div className="w-1/2 p-5 flex items-center">
            <MediaDisplay
              media={slide.media}
              layout={slide.mediaLayout ?? "slideshow"}
            />
          </div>

          {/* Right: text content */}
          <div className="w-1/2 flex flex-col justify-center p-8 pr-10">
            <h2 className="text-2xl font-bold text-(--color-foreground) leading-tight mb-4">
              {slide.title}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {slide.displayText}
            </p>

            <VapiControls
              speaking={speaking}
              autoSpeak={autoSpeak}
              voiceEnabled={callActive}
              onPlay={() => sayNarration(slide.spokenText)}
              onToggleAuto={() => setAutoSpeak((v) => !v)}
            />
          </div>
        </div>
      )}

      {/* VAPI status bar */}
      <div className="shrink-0 border-t border-(--color-border) px-6 py-1.5 flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {callActive ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Voice active
            </>
          ) : voiceSessionMode ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Connecting…
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              Voice tour not started
            </>
          )}
        </span>
        {narrating && (
          <span className="flex items-center gap-1">
            <Volume2 className="h-3 w-3" />
            Narrating
          </span>
        )}
        {speaking && !narrating && (
          <span className="flex items-center gap-1">
            <Volume2 className="h-3 w-3" />
            Answering
          </span>
        )}
        {callActive && !speaking && !narrating && (
          <span className="flex items-center gap-1">
            <Mic className="h-3 w-3" />
            Ask a question…
          </span>
        )}
        {transcript && (
          <span className="truncate max-w-xs opacity-60">
            "{transcript}"
          </span>
        )}
        {vapiError && (
          <span className="text-destructive truncate max-w-xs">
            {vapiError}
          </span>
        )}
      </div>

      {/* Debug panel */}
      {debug && (
        <div className="shrink-0 border-t border-amber-500/20 bg-amber-500/5 px-6 py-2 max-h-36 overflow-y-auto">
          <div className="flex items-center gap-4 mb-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-amber-600/70">
              VAPI — {callActive ? "connected" : "disconnected"}
              {speaking ? " — speaking" : ""}
            </p>
            <p className="text-[10px] font-mono text-amber-700/70">
              vol: {Math.round(volumeLevel * 100)}%
            </p>
          </div>
          <p className="mb-2 text-[10px] font-mono text-amber-700/70">
            ROS tour topic:{" "}
            {topics.tourControl ? JSON.stringify(topics.tourControl) : "none"}
          </p>
          <p className="text-[11px] font-mono text-amber-900/50 leading-snug">
            {slide.spokenText}
          </p>
        </div>
      )}

      {/* Bottom navigation */}
      <div className="border-t border-(--color-border) px-6 py-3 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={prev}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-(--color-border) hover:text-(--color-foreground) transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {/* Slide dots */}
        <div className="flex items-center gap-1.5">
          {tour.slides.map((s, i) => (
            <button
              type="button"
              key={s.id}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current
                  ? "h-2.5 w-2.5 bg-(--color-primary)"
                  : "h-2 w-2 bg-(--color-border) hover:bg-(--color-primary)/40"
              }`}
              aria-label={`Go to ${s.title}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-(--color-border) hover:text-(--color-foreground) transition-colors"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
