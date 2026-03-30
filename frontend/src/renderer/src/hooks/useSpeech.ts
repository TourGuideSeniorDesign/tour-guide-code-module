import { useCallback, useEffect, useRef, useState } from "react";

interface SpeechState {
	speaking: boolean;
	paused: boolean;
	/** Index of the currently-spoken segment when using speakSegments. -1 when idle. */
	activeSegment: number;
}

interface UseSpeechReturn extends SpeechState {
	speak: (text: string) => void;
	speakSegments: (texts: string[]) => void;
	pause: () => void;
	resume: () => void;
	stop: () => void;
}

export function useSpeech(): UseSpeechReturn {
	const [state, setState] = useState<SpeechState>({
		speaking: false,
		paused: false,
		activeSegment: -1,
	});
	const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
	const segmentQueueRef = useRef<string[]>([]);
	const segmentIndexRef = useRef(-1);

	useEffect(() => {
		return () => {
			window.speechSynthesis.cancel();
		};
	}, []);

	const getVoice = useCallback((): SpeechSynthesisVoice | undefined => {
		const voices = window.speechSynthesis.getVoices();
		return voices.find(
			(v) =>
				v.name.includes("Samantha") ||
				v.name.includes("Google US English") ||
				v.name.includes("Microsoft Zira"),
		);
	}, []);

	const speakOne = useCallback(
		(text: string, onEnd?: () => void) => {
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.rate = 1;
			utterance.pitch = 1;

			const preferred = getVoice();
			if (preferred) utterance.voice = preferred;

			utterance.onstart = () =>
				setState((s) => ({ ...s, speaking: true, paused: false }));
			utterance.onend = () => {
				if (onEnd) {
					onEnd();
				} else {
					setState({ speaking: false, paused: false, activeSegment: -1 });
				}
			};
			utterance.onerror = () =>
				setState({ speaking: false, paused: false, activeSegment: -1 });
			utterance.onpause = () =>
				setState((s) => ({ ...s, speaking: true, paused: true }));
			utterance.onresume = () =>
				setState((s) => ({ ...s, speaking: true, paused: false }));

			utteranceRef.current = utterance;
			window.speechSynthesis.speak(utterance);
		},
		[getVoice],
	);

	const advanceSegment = useCallback(() => {
		const queue = segmentQueueRef.current;
		const nextIdx = segmentIndexRef.current + 1;

		if (nextIdx >= queue.length) {
			segmentIndexRef.current = -1;
			segmentQueueRef.current = [];
			setState({ speaking: false, paused: false, activeSegment: -1 });
			return;
		}

		segmentIndexRef.current = nextIdx;
		setState((s) => ({ ...s, activeSegment: nextIdx }));
		const text = queue[nextIdx];
		if (text) speakOne(text, () => advanceSegment());
	}, [speakOne]);

	const speak = useCallback(
		(text: string) => {
			window.speechSynthesis.cancel();
			segmentQueueRef.current = [];
			segmentIndexRef.current = -1;
			setState((s) => ({ ...s, activeSegment: -1 }));
			speakOne(text);
		},
		[speakOne],
	);

	const speakSegments = useCallback(
		(texts: string[]) => {
			window.speechSynthesis.cancel();
			if (texts.length === 0) return;

			segmentQueueRef.current = texts;
			segmentIndexRef.current = -1;
			advanceSegment();
		},
		[advanceSegment],
	);

	const pause = useCallback(() => {
		window.speechSynthesis.pause();
	}, []);

	const resume = useCallback(() => {
		window.speechSynthesis.resume();
	}, []);

	const stop = useCallback(() => {
		window.speechSynthesis.cancel();
		segmentQueueRef.current = [];
		segmentIndexRef.current = -1;
		setState({ speaking: false, paused: false, activeSegment: -1 });
	}, []);

	return { ...state, speak, speakSegments, pause, resume, stop };
}
