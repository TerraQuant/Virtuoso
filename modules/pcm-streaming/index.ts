import { NativeModulesProxy, EventEmitter, Subscription } from 'expo-modules-core';

// Import the native module
const PcmStreamingModule = NativeModulesProxy.PcmStreaming;
const emitter = new EventEmitter(PcmStreamingModule);

export type PcmDataPayload = {
  samples: number[];
  sampleRate: number;
};

export type NoteEventPayload = {
  midi: number;
  freq: number;
  centsOff: number;
};

export type OnsetEventPayload = {
  ts: number;
};

export type StartOptions = {
  bufferSize?: number;
  sampleRate?: number;
};

// Module methods
export async function start(options?: StartOptions): Promise<void> {
  return await PcmStreamingModule.start(options ?? {});
}

export async function stop(): Promise<void> {
  return await PcmStreamingModule.stop();
}

export function setIntervalMs(ms: number): void {
  PcmStreamingModule.setIntervalMs(ms);
}

// Event subscriptions
export function addPcmDataListener(
  listener: (event: PcmDataPayload) => void
): Subscription {
  return emitter.addListener('PCM_DATA', listener);
}

export function addNoteEventListener(
  listener: (event: NoteEventPayload) => void
): Subscription {
  return emitter.addListener('NOTE_EVENT', listener);
}

export function addOnsetEventListener(
  listener: (event: OnsetEventPayload) => void
): Subscription {
  return emitter.addListener('ONSET_EVENT', listener);
}

// Re-export for convenience
export { PcmStreamingModule };
