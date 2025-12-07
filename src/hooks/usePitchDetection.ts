import { useCallback, useEffect, useState, useRef } from "react";
import { Audio } from "expo-av";
import {
  isPcmSupported,
  startPcmStream,
  stopPcmStream,
  subscribePcm,
  subscribeNoteEvent,
  isNativeNoteEventSupported,
  NoteEventPayload
} from "../lib/audio/nativeAudio";

export type Note = { name: string; freq: number; midi: number };
export type PitchResult = {
  detectedFreq: number | null;
  detectedNote: Note | null;
  centsOff: number | null;
  isMatch: boolean;
  usingNativeDetection: boolean;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const noteFromFrequency = (freq: number): Note => {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  return { name: `${name}${octave}`, freq: 440 * Math.pow(2, (midi - 69) / 12), midi };
};

export const noteFromMidi = (midi: number): Note => {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[midi % 12];
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  return { name: `${name}${octave}`, freq, midi };
};

/**
 * JS fallback autocorrelation for pitch detection.
 * Used when native NOTE_EVENT is not available.
 */
const autocorrelate = (buffer: Float32Array, sampleRate: number): number | null => {
  let SIZE = buffer.length;
  let MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;

  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return null; // silence

  let lastCorrelation = 1;
  for (let offset = 2; offset <= MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    if (correlation > 0.9 && correlation > lastCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    } else if (bestOffset > -1 && correlation < lastCorrelation) {
      return sampleRate / bestOffset;
    }
    lastCorrelation = correlation;
  }
  if (bestCorrelation > 0.92 && bestOffset !== -1) return sampleRate / bestOffset;
  return null;
};

export const usePitchDetection = (targetNote?: Note) => {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [pitch, setPitch] = useState<PitchResult>({
    detectedFreq: null,
    detectedNote: null,
    centsOff: null,
    isMatch: false,
    usingNativeDetection: false
  });

  // Track if we've received native events (to disable JS fallback)
  const hasReceivedNativeEvent = useRef(false);

  // Handle native NOTE_EVENT (preferred, lower latency)
  const processNativeNoteEvent = useCallback(
    (event: NoteEventPayload) => {
      hasReceivedNativeEvent.current = true;

      const detectedNote = noteFromMidi(event.midi);
      const isMatch =
        targetNote !== undefined
          ? Math.abs(1200 * Math.log2(event.freq / targetNote.freq)) < 25
          : false;

      setPitch({
        detectedFreq: event.freq,
        detectedNote,
        centsOff: event.centsOff,
        isMatch,
        usingNativeDetection: true
      });
    },
    [targetNote]
  );

  // Handle PCM frames for JS fallback pitch detection
  const processFrame = useCallback(
    (frame: { buffer: Float32Array; sampleRate: number }) => {
      // Skip JS processing if we're receiving native events
      if (hasReceivedNativeEvent.current || isNativeNoteEventSupported()) {
        return;
      }

      const freq = autocorrelate(frame.buffer, frame.sampleRate);
      if (!freq) {
        setPitch({
          detectedFreq: null,
          detectedNote: null,
          centsOff: null,
          isMatch: false,
          usingNativeDetection: false
        });
        return;
      }

      const detectedNote = noteFromFrequency(freq);
      const centsOff = 1200 * Math.log2(freq / detectedNote.freq);
      const isMatch =
        targetNote !== undefined
          ? Math.abs(1200 * Math.log2(freq / targetNote.freq)) < 25
          : false;

      setPitch({
        detectedFreq: freq,
        detectedNote,
        centsOff,
        isMatch,
        usingNativeDetection: false
      });
    },
    [targetNote]
  );

  useEffect(() => {
    let cleanupPcm: (() => void) | null = null;
    let cleanupNote: (() => void) | null = null;
    let cancelled = false;

    const start = async () => {
      if (!isPcmSupported()) return;
      if (!permissionResponse?.granted) {
        const res = await requestPermission();
        if (!res?.granted) return;
      }

      // Reset native event tracking
      hasReceivedNativeEvent.current = false;

      await startPcmStream({ bufferSize: 2048, sampleRate: 44100 });

      // Subscribe to native NOTE_EVENT (preferred)
      cleanupNote = subscribeNoteEvent(processNativeNoteEvent);

      // Subscribe to PCM for JS fallback
      cleanupPcm = subscribePcm(processFrame);
    };

    start();

    return () => {
      cancelled = true;
      cleanupNote?.();
      cleanupPcm?.();
      stopPcmStream();
    };
  }, [permissionResponse?.granted, processFrame, processNativeNoteEvent, requestPermission]);

  return pitch;
};
