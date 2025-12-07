# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Virtuoso** is a premium, playful piano tutor mobile app built with Expo React Native. It uses real-time audio analysis for near-zero latency pitch and rhythm detection, adaptive curriculum generation, and gamified learning experiences with geo-aware monetization.

## Development Commands

```bash
# Start development server
npm start

# Run on specific platforms
npm run android
npm run ios
npm run web

# Linting
npm run lint
```

## Architecture

### Tech Stack
- **Frontend**: Expo SDK 54 + React Native 0.73 + TypeScript
- **Routing**: expo-router (file-based routing)
- **State**: Zustand for session management
- **Persistence**: AsyncStorage via custom persistence layer
- **Audio**: expo-av for permissions; custom native PCM streaming module with YIN pitch detection
- **Animation**: react-native-reanimated
- **AI**: Google Gemini API for onboarding personalization

### Core Audio Pipeline

The app's central feature is **real-time pitch/rhythm detection**:

1. **Native PCM Module** (`modules/pcm-streaming/`):
   - Full Expo Modules implementation for iOS (Swift) and Android (Kotlin)
   - Config plugin at `plugins/withPcmStreaming.js` handles permissions
   - Streams Float32 PCM frames at 44.1kHz, 2048 buffer size
   - **Native YIN pitch detection** emits `NOTE_EVENT` with midi, freq, centsOff
   - **Native onset detection** emits `ONSET_EVENT` with timestamp
   - See detailed docs in `src/lib/audio/README.md`

2. **JS Audio Bridge** (`src/lib/audio/nativeAudio.ts`):
   - Wraps native module with fallback emitter for development/Expo Go
   - Subscribes to `PCM_DATA`, `NOTE_EVENT`, `ONSET_EVENT`
   - Exposes `subscribeNoteEvent()` and `subscribeOnsetEvent()` for native events
   - Falls back to JS processing when native not available

3. **Pitch Detection** (`src/hooks/usePitchDetection.ts`):
   - Prefers native `NOTE_EVENT` for low-latency detection (<50ms)
   - Falls back to JS autocorrelation when native unavailable
   - Returns `usingNativeDetection` flag for debugging

4. **Onset/Timing Detection** (`src/hooks/useOnsetMeter.ts`):
   - Prefers native `ONSET_EVENT` for accurate timing
   - Falls back to JS peak amplitude detection
   - Returns `usingNativeDetection` flag for debugging

### State Management

**Session Store** (`src/state/sessionStore.ts`) manages:
- Kid-friendly level labels and self-description
- AI-generated profile, focus areas, and mini-tests
- Computed maestro level (1-100 scale)
- 12-week curriculum (84 daily plans)
- Persistence via `src/state/persistence.ts` (AsyncStorage)
- Hydration happens in `app/_layout.tsx` on app launch

**Level Computation** (`src/lib/maestro/level.ts`):
- Weighted scoring across 6 dimensions: pitch accuracy, rhythm accuracy, tempo stability, range coverage, left/right balance, retry penalty
- Returns level 1-100 and diagnostic summary
- Maestro level is blended with AI bucket (kid level label ±10) to avoid jarring discrepancies

### AI-Assisted Onboarding

**Gemini Client** (`src/lib/ai/geminiClient.ts`):
- Takes kid level label + self-description
- Returns: upbeat profile blurb (≤300 chars), 3 focus areas, 2 mini-tests (≤30sec each)
- Sanitizes output (ASCII only, no PII echo)
- Falls back to mock data if API key missing or on error
- Mini-tests drive calibration screen

**Onboarding Flow**:
1. `app/onboarding/maestro.tsx`: user selects level chip + describes themselves → Gemini generates profile
2. `app/onboarding/calibration.tsx`: runs 2 mini-tests with live pitch/onset detection → computes PlayStats
3. Store blends DSP-computed level with AI bucket → generates curriculum

### Curriculum System

**Generator** (`src/curriculum/generator.ts`):
- Produces 12 weeks × 7 days = 84 daily plans
- Each plan has 4 blocks: warmup, drill, song, boss
- Base tempo/difficulty derived from maestro level
- Block selection influenced by AI focus areas (timing, reading, dynamics, coordination)
- Adaptive rules embedded per day (e.g., drop tempo if score < 75%)

**Session Screen** (`app/session/[day].tsx`):
- Displays day plan via `sessionStore.getDayPlan(dayIndex)`
- Renders blocks with `DayPlanCard` component
- Wired to live pitch detection for interactive practice

### Payment Routing

Geo-aware payment flow (`src/components/payments/*`):
- `PaymentRouter`: switches between UPI (India) and Stripe (global) via `useGeoCountry` hook
- Hook uses IP-based geolocation (placeholder for backend endpoint)
- `UpiButton` / `StripeSheetButton`: platform-specific integrations (stubs for now)
- Paywall screen at `app/paywall.tsx`

### Gamification

**Success Screen** (`src/components/gamification/SuccessScreen.tsx`):
- Animated confetti/celebration on lesson completion
- Ready to wire to lesson completion events (not yet connected)

## Key Implementation Details

### Native Audio Module (Implemented)
Located at `modules/pcm-streaming/`:
- **Module name**: `PcmStreaming`
- **Methods**: `start({ bufferSize, sampleRate })`, `stop()`, `setIntervalMs(ms)`
- **Events**:
  - `PCM_DATA`: `{ samples: number[], sampleRate: number }` (downsampled for JS)
  - `NOTE_EVENT`: `{ midi: number, freq: number, centsOff: number }` (native YIN)
  - `ONSET_EVENT`: `{ ts: number }` (native onset detection)
- **iOS**: AVAudioEngine with `playAndRecord` category, `measurement` mode, YIN in Swift
- **Android**: AudioRecord with `LOW_LATENCY` performance mode, YIN in Kotlin
- **YIN Parameters**: threshold 0.15, frequency range 60-1500 Hz
- **Onset Parameters**: RMS threshold 0.10, debounce 120ms

### Level Buckets
Kid-friendly labels map to internal buckets (used for blending):
- New Explorer (20), Sound Scout (30), Melody Maker (40), Groove Cadet (55), Rhythm Ranger (65), Chord Captain (75), Stage Star (85), Virtuoso Pro (95)

### Focus Areas
AI suggests 3 from: timing, reading, expression, coordination, dynamics, left-hand independence. These influence drill selection in curriculum.

## File Structure Highlights

```
app/
  _layout.tsx           # Root layout, hydrates state on mount
  index.tsx             # Entry demo (pitch detection + ActiveStaff)
  paywall.tsx           # Payment screen
  onboarding/
    maestro.tsx         # AI-driven level + profile setup
    calibration.tsx     # Mini-test runner with DSP scoring
  session/
    [day].tsx           # Daily curriculum session screen

src/
  components/
    curriculum/         # DayPlanCard
    gamification/       # SuccessScreen
    music/              # ActiveStaff (scrolling staff notation)
    payments/           # PaymentRouter, UpiButton, StripeSheetButton
    ui/                 # Text component
  curriculum/
    generator.ts        # 12-week curriculum builder
  hooks/
    useGeoCountry.ts    # IP geolocation (stub)
    useOnsetMeter.ts    # Native onset detection with JS fallback
    usePitchDetection.ts # Native YIN pitch detection with JS fallback
  lib/
    ai/
      geminiClient.ts   # Gemini profile/mini-test generation
    audio/
      nativeAudio.ts    # PCM module bridge with native event subscriptions
      README.md         # Native implementation docs
    maestro/
      level.ts          # Level computation from PlayStats
  state/
    persistence.ts      # AsyncStorage save/load
    sessionStore.ts     # Zustand store for session state

modules/
  pcm-streaming/
    index.ts            # TypeScript exports
    expo-module.config.json
    package.json
    ios/
      PcmStreaming.podspec
      PcmStreamingModule.swift    # AVAudioEngine + YIN + onset
    android/
      build.gradle
      src/main/java/.../PcmStreamingModule.kt  # AudioRecord + YIN + onset

plugins/
  withPcmStreaming.js   # Expo config plugin (permissions + module linking)
```

## Important Patterns

1. **Pitch Detection Hook**: Always used with target note for real-time matching. Returns `{ detectedFreq, detectedNote, centsOff, isMatch, usingNativeDetection }`.

2. **State Persistence**: All critical session state auto-saves to AsyncStorage on mutation. Hydrate is called once in root layout.

3. **AI Fallback**: Gemini client always falls back to mock data. Never block user flow on AI failures.

4. **Curriculum Blending**: Maestro level is 60% DSP, 40% AI bucket, clamped within ±10 of bucket to avoid jarring jumps.

5. **Native Module Development**: Use fallback emitter in `nativeAudio.ts` during Expo Go development. For native module testing, run `npx expo prebuild --clean && npx expo run:ios --device` (or `run:android`).

## Configuration

- **Expo Config**: `app.json` defines app metadata, splash, icons, permissions (RECORD_AUDIO on Android), and plugins (expo-router, withPcmStreaming).
- **TypeScript**: `tsconfig.json` for type checking; project uses strict mode.
- **Environment**: `GEMINI_API_KEY` env var for AI features (gracefully degrades without it).

## Testing Notes

- Add unit tests for: pitch autocorrelation, level computation, curriculum generator, AI prompt sanitization, onset detection.
- Device testing critical for audio latency validation (target <50ms mic-to-UI).
- Test geo-routing on real devices with VPN to verify India vs global payment flow.
