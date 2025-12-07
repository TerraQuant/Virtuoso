import { useEffect, useRef, useState } from "react";
import {
  isPcmSupported,
  startPcmStream,
  stopPcmStream,
  subscribePcm,
  subscribeOnsetEvent,
  isNativeOnsetEventSupported,
  OnsetEventPayload
} from "../lib/audio/nativeAudio";

type OnsetState = {
  onsets: number[]; // timestamps ms
  avgInterval: number | null;
  jitterMs: number | null;
  usingNativeDetection: boolean;
};

// JS fallback thresholds
const ONSET_THRESHOLD = 0.12; // amplitude threshold for clap/tap detection
const MIN_GAP_MS = 120; // debounce to avoid double-counting

export const useOnsetMeter = (enabled: boolean) => {
  const [state, setState] = useState<OnsetState>({
    onsets: [],
    avgInterval: null,
    jitterMs: null,
    usingNativeDetection: false
  });
  const lastOnsetRef = useRef(0);
  const hasReceivedNativeEvent = useRef(false);

  useEffect(() => {
    if (!enabled || !isPcmSupported()) return;
    let mounted = true;
    let cleanupPcm: (() => void) | null = null;
    let cleanupOnset: (() => void) | null = null;

    // Calculate interval statistics
    const computeStats = (onsets: number[]) => {
      if (onsets.length < 2) {
        return { avgInterval: null, jitterMs: null };
      }
      const intervals = onsets.slice(1).map((t, idx) => t - onsets[idx]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance =
        intervals.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / intervals.length;
      const jitter = Math.sqrt(variance);
      return { avgInterval: avg, jitterMs: jitter };
    };

    // Handle native ONSET_EVENT (preferred, more accurate timing)
    const handleNativeOnset = (event: OnsetEventPayload) => {
      if (!mounted) return;
      hasReceivedNativeEvent.current = true;

      const now = event.ts;

      setState((prev) => {
        const onsets = [...prev.onsets, now];
        const stats = computeStats(onsets);
        return {
          onsets,
          avgInterval: stats.avgInterval,
          jitterMs: stats.jitterMs,
          usingNativeDetection: true
        };
      });
    };

    // JS fallback: detect onsets from PCM amplitude
    const handleFrame = (frame: { buffer: Float32Array; sampleRate: number }) => {
      if (!mounted) return;

      // Skip JS processing if we're receiving native events
      if (hasReceivedNativeEvent.current || isNativeOnsetEventSupported()) {
        return;
      }

      const buf = frame.buffer;
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = Math.abs(buf[i]);
        if (v > peak) peak = v;
        if (peak > ONSET_THRESHOLD) break;
      }

      if (peak > ONSET_THRESHOLD) {
        const now = Date.now();
        if (now - lastOnsetRef.current > MIN_GAP_MS) {
          lastOnsetRef.current = now;
          setState((prev) => {
            const onsets = [...prev.onsets, now];
            const stats = computeStats(onsets);
            return {
              onsets,
              avgInterval: stats.avgInterval,
              jitterMs: stats.jitterMs,
              usingNativeDetection: false
            };
          });
        }
      }
    };

    (async () => {
      // Reset native event tracking
      hasReceivedNativeEvent.current = false;

      await startPcmStream({ bufferSize: 1024, sampleRate: 44100 });

      // Subscribe to native ONSET_EVENT (preferred)
      cleanupOnset = subscribeOnsetEvent(handleNativeOnset);

      // Subscribe to PCM for JS fallback
      cleanupPcm = subscribePcm(handleFrame);
    })();

    return () => {
      mounted = false;
      cleanupOnset?.();
      cleanupPcm?.();
      stopPcmStream();
    };
  }, [enabled]);

  return state;
};
