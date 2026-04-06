import { Check, Loader2, Send } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import type { TourControlMessage } from "../../../shared/rosBridge";
import type { TourSlide } from "../types/tour";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Label } from "./ui/label";

interface TourControlPanelProps {
  slides: TourSlide[];
  latestMessage: TourControlMessage | null;
  isConnected: boolean;
  onPublish: (message: TourControlMessage) => Promise<{
    ok: boolean;
    error?: string;
  }>;
}

export function TourControlPanel({
  slides,
  latestMessage,
  isConnected,
  onPublish,
}: TourControlPanelProps): React.JSX.Element {
  const defaultSlideId = useMemo(() => slides[0]?.id ?? "", [slides]);
  const [slideId, setSlideId] = useState(defaultSlideId);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(
    null,
  );

  useEffect(() => {
    if (!slideId && defaultSlideId) {
      setSlideId(defaultSlideId);
    }
  }, [defaultSlideId, slideId]);

  const handlePublish = async (): Promise<void> => {
    setSubmitting(true);
    const nextResult = await onPublish({ slide_id: slideId });
    setResult(nextResult);
    setSubmitting(false);
  };

  return (
    <div className="flex flex-col gap-3 min-w-80">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tour Control
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Publish the same ROS topic used to trigger tour slides.
          </p>
        </div>
        <Badge variant={isConnected ? "success" : "outline"}>
          {isConnected ? (
            <Check className="h-3 w-3" />
          ) : (
            <Loader2 className="h-3 w-3" />
          )}
          {isConnected ? "Live" : "Offline"}
        </Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tour-slide-id">Target slide</Label>
        <select
          id="tour-slide-id"
          value={slideId}
          onChange={(event) => setSlideId(event.target.value)}
          className="h-10 rounded-md border border-(--color-border) bg-transparent px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {slides.map((slide) => (
            <option key={slide.id} value={slide.id}>
              {slide.title}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="button"
        onClick={() => void handlePublish()}
        disabled={!slideId || submitting}
      >
        <Send className="h-4 w-4" />
        {submitting ? "Publishing" : "Publish signal"}
      </Button>

      {result && !result.ok && (
        <p className="text-xs text-destructive">{result.error}</p>
      )}

      <div className="rounded-lg bg-(--color-secondary) px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Latest tour topic
        </p>
        {latestMessage ? (
          <p className="mt-1 text-xs font-mono text-(--color-foreground)">
            {JSON.stringify(latestMessage)}
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            No message received
          </p>
        )}
      </div>
    </div>
  );
}
