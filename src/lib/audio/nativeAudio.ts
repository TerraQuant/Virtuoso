import { NativeEventEmitter, NativeModules, Platform } from "react-native";

// Native module contract: exposes start(), stop(), setIntervalMs(), and sends events:
// - PCM_DATA: { samples: number[]; sampleRate: number }
// - NOTE_EVENT: { midi: number; freq: number; centsOff: number }
// - ONSET_EVENT: { ts: number }
type PcmModule = {
  start: (opts?: { bufferSize?: number; sampleRate?: number }) => Promise<void> | void;
  stop: () => Promise<void> | void;
  setIntervalMs?: (ms: number) => void;
};

export type PcmPayload = { samples: number[]; sampleRate: number };
export type NoteEventPayload = { midi: number; freq: number; centsOff: number };
export type OnsetEventPayload = { ts: number };

const NativePcmModule: PcmModule | undefined = (NativeModules as any).PcmStreaming;
const emitter = NativePcmModule ? new NativeEventEmitter(NativePcmModule as any) : null;

export type PcmFrame = { buffer: Float32Array; sampleRate: number };
type PcmListener = (frame: PcmFrame) => void;
type NoteListener = (event: NoteEventPayload) => void;
type OnsetListener = (event: OnsetEventPayload) => void;

// Track if native events are supported (set to true when first NOTE_EVENT or ONSET_EVENT received)
let nativeNoteEventsSupported = false;
let nativeOnsetEventsSupported = false;

/**
 * Check if native NOTE_EVENT is supported.
 * Returns true if we've received at least one NOTE_EVENT from native.
 */
export const isNativeNoteEventSupported = () => nativeNoteEventsSupported;

/**
 * Check if native ONSET_EVENT is supported.
 * Returns true if we've received at least one ONSET_EVENT from native.
 */
export const isNativeOnsetEventSupported = () => nativeOnsetEventsSupported;

/**
 * Subscribe to PCM frames from the native module.
 * Falls back to silent frames when native not available.
 */
export const subscribePcm = (listener: PcmListener) => {
  if (emitter) {
    const sub = emitter.addListener("PCM_DATA", (payload: PcmPayload) => {
      listener({ buffer: new Float32Array(payload.samples), sampleRate: payload.sampleRate });
    });
    return () => sub.remove();
  }

  // Fallback simulator: emit silence to keep hook stable when native not available.
  let active = true;
  const interval = setInterval(() => {
    if (!active) return;
    const silent = new Float32Array(1024);
    listener({ buffer: silent, sampleRate: 44100 });
  }, 200);

  return () => {
    active = false;
    clearInterval(interval);
  };
};

/**
 * Subscribe to NOTE_EVENT from native YIN pitch detection.
 * These events provide lower latency pitch detection than JS processing.
 * Returns unsubscribe function, or null if not supported.
 */
export const subscribeNoteEvent = (listener: NoteListener): (() => void) | null => {
  if (!emitter) return null;

  const sub = emitter.addListener("NOTE_EVENT", (payload: NoteEventPayload) => {
    nativeNoteEventsSupported = true;
    listener(payload);
  });

  return () => sub.remove();
};

/**
 * Subscribe to ONSET_EVENT from native onset detection.
 * These events provide more accurate timing detection than JS processing.
 * Returns unsubscribe function, or null if not supported.
 */
export const subscribeOnsetEvent = (listener: OnsetListener): (() => void) | null => {
  if (!emitter) return null;

  const sub = emitter.addListener("ONSET_EVENT", (payload: OnsetEventPayload) => {
    nativeOnsetEventsSupported = true;
    listener(payload);
  });

  return () => sub.remove();
};

/**
 * Start the native PCM audio capture stream.
 */
export const startPcmStream = async (opts?: { bufferSize?: number; sampleRate?: number }) => {
  // Reset native event support flags on start
  nativeNoteEventsSupported = false;
  nativeOnsetEventsSupported = false;

  if (NativePcmModule?.start) {
    await NativePcmModule.start(opts);
  } else {
    if (__DEV__) {
      console.warn("PcmStreaming native module not found; using fallback.");
    }
  }
};

/**
 * Stop the native PCM audio capture stream.
 */
export const stopPcmStream = async () => {
  if (NativePcmModule?.stop) {
    await NativePcmModule.stop();
  }
};

/**
 * Helper to adjust processing interval on low-power devices.
 */
export const setPcmInterval = (ms: number) => NativePcmModule?.setIntervalMs?.(ms);

/**
 * Type guard for platforms with microphone support.
 */
export const isPcmSupported = () => Platform.OS === "ios" || Platform.OS === "android";

/**
 * Check if the native module is available (not just the platform).
 */
export const isNativeModuleAvailable = () => !!NativePcmModule;
