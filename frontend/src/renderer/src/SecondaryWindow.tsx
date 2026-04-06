import {
  Bug,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pause,
  Play,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchTourData } from "./api/tourData";
import { useRosBridge } from "./hooks/useRosBridge";
import { useSpeech } from "./hooks/useSpeech";
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
  activeSegment,
  speaking,
  paused,
  autoSpeak,
  onPlaySegments,
  onPause,
  onResume,
  onStop,
  onToggleAuto,
}: {
  title: string;
  segments: TourSegment[];
  activeSegment: number;
  speaking: boolean;
  paused: boolean;
  autoSpeak: boolean;
  onPlaySegments: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onToggleAuto: () => void;
}): React.JSX.Element {
  const resolvedIdx = activeSegment >= 0 ? activeSegment : 0;
  const activeMedia = segments[resolvedIdx]?.media ?? [];

  return (
    <div className="flex-1 flex min-h-0">
      {/* Left: media tied to active segment */}
      <div className="w-1/2 p-5 flex items-center">
        <div className="relative w-full h-full overflow-hidden rounded-xl bg-black/5">
          {activeMedia[0] && <MediaItem item={activeMedia[0]} />}

          {segments.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {segments.map((_, i) => (
                <div
                  key={segments[i]?.spokenText.slice(0, 20)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === resolvedIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: stacked text segments */}
      <div className="w-1/2 flex flex-col justify-center p-8 pr-10">
        <h2 className="text-2xl font-bold text-(--color-foreground) leading-tight mb-4">
          {title}
        </h2>

        <div className="flex flex-col gap-4">
          {segments.map((seg, i) => {
            const isActive = speaking && i === activeSegment;
            const isPast = speaking && activeSegment > i;
            return (
              <div
                key={seg.displayText.slice(0, 30)}
                className={`rounded-lg px-4 py-3 transition-all duration-500 border-l-2 ${
                  isActive
                    ? "border-l-(--color-primary) bg-(--color-primary)/5"
                    : isPast
                      ? "border-l-(--color-primary)/30 opacity-60"
                      : "border-l-transparent"
                }`}
              >
                <p className="text-base text-muted-foreground leading-relaxed">
                  {seg.displayText}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {!speaking ? (
            <button
              type="button"
              onClick={onPlaySegments}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary)/20 transition-colors"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Play narration
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={paused ? onResume : onPause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary)/20 transition-colors"
              >
                {paused ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            </>
          )}

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
      </div>
    </div>
  );
}

export default function SecondaryWindow(): React.JSX.Element {
  const [tour, setTour] = useState<TourData | null>(null);
  const [current, setCurrent] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [debug, setDebug] = useState(false);
  const lastTourSignalRef = useRef<string | null>(null);
  const { topics } = useRosBridge();
  const {
    speaking,
    paused,
    activeSegment,
    speak,
    speakSegments,
    pause,
    resume,
    stop,
  } = useSpeech();

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
      stop();
      setCurrent(index);
    },
    [stop],
  );

  const prev = useCallback(
    () => goTo((current - 1 + total) % total),
    [current, total, goTo],
  );

  const next = useCallback(
    () => goTo((current + 1) % total),
    [current, total, goTo],
  );

  useEffect(() => {
    if (!slide || !autoSpeak) return;
    if (slide.mediaLayout === "segments" && slide.segments?.length) {
      speakSegments(slide.segments.map((seg) => seg.spokenText));
    } else {
      speak(slide.spokenText);
    }
  }, [slide, autoSpeak, speak, speakSegments]);

  useEffect(() => {
    const message = topics.tourControl;
    if (!message || !tour) return;

    const signalKey = message.slide_id;
    if (signalKey === lastTourSignalRef.current) return;
    lastTourSignalRef.current = signalKey;

    const nextIndex = slideIndexById.get(message.slide_id);
    if (nextIndex === undefined) return;

    if (nextIndex === current) {
      stop();
      if (autoSpeak) {
        const nextSlide = tour.slides[nextIndex];
        if (
          nextSlide?.mediaLayout === "segments" &&
          nextSlide.segments?.length
        ) {
          speakSegments(nextSlide.segments.map((seg) => seg.spokenText));
        } else if (nextSlide) {
          speak(nextSlide.spokenText);
        }
      }
      return;
    }

    goTo(nextIndex);
  }, [
    topics.tourControl,
    tour,
    slideIndexById,
    goTo,
    current,
    autoSpeak,
    speak,
    speakSegments,
    stop,
  ]);

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

      {/* Main content */}
      {slide.mediaLayout === "segments" && slide.segments?.length ? (
        <SegmentedSlide
          title={slide.title}
          segments={slide.segments}
          activeSegment={activeSegment}
          speaking={speaking}
          paused={paused}
          autoSpeak={autoSpeak}
          onPlaySegments={() =>
            speakSegments((slide.segments ?? []).map((seg) => seg.spokenText))
          }
          onPause={pause}
          onResume={resume}
          onStop={stop}
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

            {/* Speech controls */}
            <div className="flex items-center gap-2 mt-6">
              {!speaking ? (
                <button
                  type="button"
                  onClick={() => speak(slide.spokenText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary)/20 transition-colors"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Play narration
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={paused ? resume : pause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary)/20 transition-colors"
                  >
                    {paused ? (
                      <Play className="h-3.5 w-3.5" />
                    ) : (
                      <Pause className="h-3.5 w-3.5" />
                    )}
                    {paused ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={stop}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setAutoSpeak((v) => !v)}
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
          </div>
        </div>
      )}

      {/* Debug panel */}
      {debug && (
        <div className="shrink-0 border-t border-amber-500/20 bg-amber-500/5 px-6 py-2 max-h-36 overflow-y-auto">
          <p className="text-[10px] font-mono uppercase tracking-wider text-amber-600/70 mb-1">
            Spoken text
            {slide.mediaLayout === "segments" && activeSegment >= 0
              ? ` — segment ${activeSegment + 1}/${slide.segments?.length ?? 0}`
              : ""}
          </p>
          <p className="mb-2 text-[10px] font-mono text-amber-700/70">
            Tour topic:{" "}
            {topics.tourControl ? JSON.stringify(topics.tourControl) : "none"}
          </p>
          {slide.mediaLayout === "segments" && slide.segments?.length ? (
            <div className="flex flex-col gap-1.5">
              {slide.segments.map((seg, i) => (
                <p
                  key={seg.spokenText.slice(0, 30)}
                  className={`text-[11px] font-mono leading-snug transition-colors ${
                    speaking && i === activeSegment
                      ? "text-amber-700"
                      : "text-amber-900/40"
                  }`}
                >
                  <span className="text-amber-500/60 mr-1">[{i + 1}]</span>
                  {seg.spokenText}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[11px] font-mono text-amber-900/50 leading-snug">
              {slide.spokenText}
            </p>
          )}
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
