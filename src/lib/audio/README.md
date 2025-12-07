# Native Audio Module

## Overview

The `PcmStreaming` module provides low-latency audio capture with native pitch and onset detection for real-time piano tutoring. It uses YIN algorithm for accurate pitch detection and energy-based onset detection.

## Module Location

```
modules/pcm-streaming/
  - index.ts              # TypeScript exports
  - expo-module.config.json
  - package.json
  - ios/
    - PcmStreaming.podspec
    - PcmStreamingModule.swift   # AVAudioEngine + YIN
  - android/
    - build.gradle
    - src/main/
      - AndroidManifest.xml
      - java/expo/modules/pcmstreaming/
        - PcmStreamingModule.kt  # AudioRecord + YIN
```

## JS API

### Methods

```typescript
import { startPcmStream, stopPcmStream, setPcmInterval } from '../lib/audio/nativeAudio';

// Start capture
await startPcmStream({ bufferSize: 2048, sampleRate: 44100 });

// Stop capture and release resources
await stopPcmStream();

// Adjust processing interval (optional)
setPcmInterval(50);
```

### Events

The module emits three event types:

1. **PCM_DATA**: Raw audio frames for JS fallback processing
   ```typescript
   { samples: number[]; sampleRate: number }
   ```

2. **NOTE_EVENT**: Native pitch detection results (lower latency)
   ```typescript
   { midi: number; freq: number; centsOff: number }
   ```

3. **ONSET_EVENT**: Native onset/tap detection
   ```typescript
   { ts: number }  // timestamp in ms
   ```

### Subscriptions

```typescript
import {
  subscribePcm,
  subscribeNoteEvent,
  subscribeOnsetEvent
} from '../lib/audio/nativeAudio';

// Subscribe to PCM frames (for JS fallback)
const unsubPcm = subscribePcm((frame) => {
  // frame.buffer: Float32Array, frame.sampleRate: number
});

// Subscribe to native pitch detection (preferred)
const unsubNote = subscribeNoteEvent((event) => {
  // event.midi, event.freq, event.centsOff
});

// Subscribe to native onset detection (preferred)
const unsubOnset = subscribeOnsetEvent((event) => {
  // event.ts (timestamp)
});

// Cleanup
unsubPcm();
unsubNote?.();
unsubOnset?.();
```

## Hooks

### usePitchDetection

Detects pitch using native YIN algorithm with JS autocorrelation fallback.

```typescript
import { usePitchDetection } from '../hooks/usePitchDetection';

const targetNote = { name: 'C4', freq: 261.63, midi: 60 };
const pitch = usePitchDetection(targetNote);

// pitch.detectedFreq: number | null
// pitch.detectedNote: Note | null
// pitch.centsOff: number | null
// pitch.isMatch: boolean (within 25 cents of target)
// pitch.usingNativeDetection: boolean
```

### useOnsetMeter

Detects note onsets (taps/claps) for timing exercises.

```typescript
import { useOnsetMeter } from '../hooks/useOnsetMeter';

const state = useOnsetMeter(enabled);

// state.onsets: number[] (timestamps)
// state.avgInterval: number | null (ms)
// state.jitterMs: number | null
// state.usingNativeDetection: boolean
```

## Native Implementation Details

### iOS (Swift + AVAudioEngine)

- **Audio Session**: Category `playAndRecord`, mode `measurement`
- **IO Buffer**: Preferred duration = bufferSize / sampleRate (~46ms for 2048 @ 44.1kHz)
- **Tap**: Installed on input node bus 0, receives Float32 PCM
- **YIN**: Implemented in Swift with parabolic interpolation
- **Onset**: RMS energy delta detection with 120ms debounce

### Android (Kotlin + AudioRecord)

- **Audio Source**: `UNPROCESSED` (API 24+) or `VOICE_RECOGNITION` (fallback)
- **Encoding**: `PCM_FLOAT` for native float samples
- **Performance Mode**: `LOW_LATENCY` (API 26+)
- **Buffer**: 2x min buffer size for stability
- **YIN**: Implemented in Kotlin with parabolic interpolation
- **Onset**: RMS energy delta detection with 120ms debounce

### YIN Algorithm Parameters

- **Threshold**: 0.15 (lower = stricter pitch requirement)
- **Frequency Range**: 60-1500 Hz (covers piano range C2-G6)
- **RMS Silence Threshold**: 0.01 (ignore very quiet signals)

### Onset Detection Parameters

- **Energy Threshold**: 0.10 (RMS delta to trigger onset)
- **Debounce**: 120ms minimum gap between onsets

## Building

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run prebuild to generate native projects:
   ```bash
   npx expo prebuild --clean
   ```

3. Build for device:
   ```bash
   # iOS
   npx expo run:ios --device

   # Android
   npx expo run:android --device
   ```

## Testing

### Pitch Detection

1. Launch app on device (not simulator - requires real microphone)
2. Navigate to calibration screen or index demo
3. Play notes on piano or sing into microphone
4. Verify:
   - Detected note matches played note
   - Cents deviation is reasonable (<15 cents for in-tune notes)
   - Latency is <50ms (subjectively instantaneous)
   - `usingNativeDetection` is true

### Onset Detection

1. Enable timing calibration test
2. Clap or tap near microphone
3. Verify:
   - Each tap registers once (no double-counting)
   - Timestamps are accurate
   - Jitter calculation is reasonable
   - `usingNativeDetection` is true

### Fallback Testing

1. Test on Expo Go (native module won't be available)
2. Verify JS fallback activates:
   - `usingNativeDetection` should be false
   - Basic pitch detection still works (higher latency)
   - Onset detection still works via PCM amplitude

## Troubleshooting

### Permission Denied

- iOS: Check NSMicrophoneUsageDescription in Info.plist
- Android: Check RECORD_AUDIO permission in manifest and runtime request

### No Audio Input

- Verify microphone is not blocked by case or finger
- Check audio session is active (iOS)
- Verify no other app is holding exclusive audio

### High Latency

- Reduce buffer size to 1024 (may affect stability)
- Ensure device is not in power-saving mode
- Check for heavy JS processing blocking main thread

### Pitch Detection Inaccurate

- Ensure single sound source (no background noise)
- Play sustained notes (transients are harder to detect)
- Adjust YIN threshold if needed (lower = stricter)

## Architecture Notes

The native modules emit both PCM frames AND processed events (NOTE_EVENT, ONSET_EVENT). The JS hooks subscribe to both:

1. If native events arrive, use them (lower latency, more accurate)
2. If only PCM arrives, process in JS (fallback for dev/Expo Go)

PCM frames are downsampled before sending to JS to reduce bridge overhead while keeping native processing at full sample rate.

```
[Microphone] -> [Native Audio Buffer]
                    |
                    +-> [YIN Pitch Detection] -> NOTE_EVENT -> JS Hook
                    |
                    +-> [Onset Detection] -> ONSET_EVENT -> JS Hook
                    |
                    +-> [Downsample] -> PCM_DATA -> JS Fallback
```
