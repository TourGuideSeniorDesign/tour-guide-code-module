import Vapi from "@vapi-ai/web";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildSlideUpdateMessage,
  buildSystemPrompt,
} from "../api/vapiPrompts";
import type { TourSlide } from "../types/tour";

export interface VapiState {
  speaking: boolean;
  narrating: boolean;
  callActive: boolean;
  volumeLevel: number;
  transcript: string;
  error: string | null;
}

const VAPI_PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;

export function useVapi() {
  const vapiRef = useRef<Vapi | null>(null);
  const slidesRef = useRef<TourSlide[]>([]);
  const currentIndexRef = useRef(0);
  const callActiveRef = useRef(false);
  const narratingRef = useRef(false);

  const [state, setState] = useState<VapiState>({
    speaking: false,
    narrating: false,
    callActive: false,
    volumeLevel: 0,
    transcript: "",
    error: VAPI_PUBLIC_KEY ? null : "VITE_VAPI_PUBLIC_KEY not set",
  });

  useEffect(() => {
    if (!VAPI_PUBLIC_KEY) return;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on("speech-start", () => {
      setState((s) => ({ ...s, speaking: true }));
    });

    vapi.on("speech-end", () => {
      if (narratingRef.current) {
        narratingRef.current = false;
        vapi.setMuted(false);
        setState((s) => ({ ...s, speaking: false, narrating: false }));
      } else {
        setState((s) => ({ ...s, speaking: false }));
      }
    });

    vapi.on("call-start", () => {
      callActiveRef.current = true;
      setState((s) => ({ ...s, callActive: true, error: null }));
    });

    vapi.on("call-end", () => {
      callActiveRef.current = false;
      setState((s) => ({ ...s, callActive: false, speaking: false }));
    });

    vapi.on("volume-level", (volume: number) => {
      setState((s) => ({ ...s, volumeLevel: volume }));
    });

    vapi.on("message", (message: Record<string, unknown>) => {
      if (
        message.type === "transcript" &&
        message.transcriptType === "final" &&
        typeof message.transcript === "string"
      ) {
        setState((s) => ({ ...s, transcript: message.transcript as string }));
      }
    });

    vapi.on("error", (e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({ ...s, error: msg }));
    });

    return () => {
      vapi.stop();
      vapiRef.current = null;
    };
  }, []);

  const startCall = useCallback(
    (slides: TourSlide[], currentIndex: number) => {
      const vapi = vapiRef.current;
      if (!vapi || !VAPI_PUBLIC_KEY) return;

      slidesRef.current = slides;
      currentIndexRef.current = currentIndex;

      const systemPrompt = buildSystemPrompt(slides, currentIndex);

      vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }],
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM",
        },
        silenceTimeoutSeconds: 600,
      } as Parameters<typeof vapi.start>[0]);
    },
    [],
  );

  const stopCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const sayNarration = useCallback((text: string) => {
    const vapi = vapiRef.current;
    if (!vapi || !callActiveRef.current) return;
    narratingRef.current = true;
    vapi.setMuted(true);
    setState((s) => ({ ...s, narrating: true }));
    vapi.say(text, false);
  }, []);

  const updateSlideContext = useCallback(
    (slides: TourSlide[], currentIndex: number) => {
      const vapi = vapiRef.current;
      if (!vapi || !callActiveRef.current) return;

      slidesRef.current = slides;
      currentIndexRef.current = currentIndex;

      const currentSlide = slides[currentIndex];
      if (!currentSlide) return;

      const tourStops = slides.filter((s) => !s.id.startsWith("faq-"));
      const stopIdx = tourStops.indexOf(currentSlide);
      const effectiveIdx = stopIdx >= 0 ? stopIdx : currentIndex;

      vapi.send({
        type: "add-message",
        message: {
          role: "system",
          content: buildSlideUpdateMessage(
            currentSlide,
            effectiveIdx,
            tourStops.length,
          ),
        },
      });
    },
    [],
  );

  return {
    ...state,
    startCall,
    stopCall,
    sayNarration,
    updateSlideContext,
  };
}
