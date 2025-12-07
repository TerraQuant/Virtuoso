# Virtuoso Plan

## Goals
- Deliver a premium, playful piano tutor with real-time audio evaluation, adaptive curriculum, and gamified retention.
- Ship an Expo React Native app with native PCM streaming for near-zero latency pitch/rhythm analysis.
- Support geo-aware monetization (UPI India, Stripe global) and social duels.

## Architecture Snapshot
- Frontend: Expo RN + TypeScript, expo-router, Reanimated, NativeWind (planned), Zustand/Jotai (planned).
- Audio: Native PCM module (`PcmStreaming`) emitting frames to JS; JS hook `usePitchDetection` for UI; future YIN/ACF in Rust/C++ for low latency.
- Backend (planned): FastAPI/Node, Postgres (Supabase), Redis for duels; endpoints for maestro level, curriculum JSON, payments, geo-IP.
- Key UI: ActiveStaff scrolling staff, Success screen gamification, Paywall router (UPI/Stripe), Maestro onboarding flow.

## AI-Assisted Onboarding Strategy
- Kid-friendly level names mapping to internal buckets:  
  - New Explorer (noob, base 20), Sound Scout (starting, base 30), Melody Maker (beginner, base 40), Groove Cadet (junior intermediate, base 55), Rhythm Ranger (intermediate, base 65), Chord Captain (basic advanced, base 75), Stage Star (advanced, base 85), Virtuoso Pro (pro, base 95).
- Flow: free-text self-description + level chips → Gemini generates profile blurb, focus areas (3), and mini-tests (2) → DSP calibration runs mini-tests → maestro level computed locally and gently nudged within ±10 of bucket.
- AI is additive only: deterministic DSP scoring remains the source of truth; AI provides language, themes, and mini-test selection.

## Prompt Kit (Gemini) — Stepwise
1) **Profile + Focus Areas Prompt**  
   - Inputs: `kid_level_label`, `self_description`, `instrument="piano"`.  
   - Ask: 2–3 sentence upbeat profile (<=300 chars), 3 focus areas (timing, reading, expression, coordination, dynamics, left-hand independence), kid-friendly wording, ASCII only, no PII echo.
2) **Mini-Tests Prompt**  
   - Inputs: same as above + allowed templates.  
   - Output: 2 mini-tests, each with `title`, `duration_sec<=30`, `instruction`, `skill_tag` (timing/pitch/dynamics/coordination).  
   - Constraints: keep playful tone, no heavy theory, avoid metronome above 80 bpm for beginners.
3) **Guardrails**  
   - Clamp length; strip personal echoes; fallback to canned content on failure/timeouts; never block progression.

## Updated Next Actions
- Audio native: implement `PcmStreaming` on iOS/Android (start/stop, interval, `PCM_DATA` event); integrate YIN for accuracy; emit note events to bypass JS pitch when available.
- Assets: add icons/splash (`src/assets/*`), typography tokens, gradients.
- State: extend store for audio status, currency/streaks; persist maestro level, AI profile, focus areas, and mini-tests (AsyncStorage done); add error handling for hydration.
- Onboarding: refine timing detection and add haptics; rotate pitch targets with tempo; allow retry of mini-tests.
- Curriculum: feed focus areas into block selection; add backend endpoint to sync generated plans.
- Gamification: connect Success screen to lesson completion events; add haptics.
- Payments (later): swap stubs with Razorpay/Stripe SDKs; enforce 14-day trial gating.
- QA: device testing for latency and visual polish; add unit tests for pitch utils, level calc, curriculum generator, AI prompt sanitization, onset meter.
## Current Status (MVP Scaffold)
- Expo config + router set up.
- PCM module placeholder plugin added (`plugins/withPcmStreaming.js`).
- Pitch detection hook (`src/hooks/usePitchDetection.ts`) using autocorrelation + target matching.
- PCM bridge shell (`src/lib/audio/nativeAudio.ts`) with fallback emitter.
- ActiveStaff UI wired to pitch hook (`src/components/music/ActiveStaff.tsx`) and demo screen (`app/index.tsx`).
- Paywall routing components stubbed (`PaymentRouter`, `UpiButton`, `StripeSheetButton`) plus geo hook (`useGeoCountry`) and sample screen (`app/paywall.tsx`).
- Success animation screen added (`src/components/gamification/SuccessScreen.tsx`).
- Curriculum generator and maestro level utility scaffolded (`src/curriculum/generator.ts`, `src/lib/maestro/level.ts`).
- Maestro onboarding flow stubbed with preset stats to seed curriculum (`app/onboarding/maestro.tsx`) and Zustand store (`src/state/sessionStore.ts`).
- Session day screen shows generated plan and active listening block (`app/session/[day].tsx`, `src/components/curriculum/DayPlanCard.tsx`).
- Gemini AI scaffold added: client with mock fallback (`src/lib/ai/geminiClient.ts`), AI-driven onboarding UI (kid-friendly chips + self-description → profile/focus/mini-tests) replacing presets (`app/onboarding/maestro.tsx`), and store extended for AI persona + curriculum blending (`src/state/sessionStore.ts`).
- Calibration screen added to run mini-tests with live pitch/timing detection (`app/onboarding/calibration.tsx`), onset meter hook (`src/hooks/useOnsetMeter.ts`), persistence via AsyncStorage (`src/state/persistence.ts`) and hydration in layout. Native audio implementation guide added (`src/lib/audio/README.md`).

## Next Actions
- Audio native: implement `PcmStreaming` on iOS/Android (start/stop, interval, `PCM_DATA` event); integrate YIN for accuracy.
- Assets: add icons/splash (`src/assets/*`), typography tokens, gradients.
- State: extend store for audio status, currency/streaks; persist maestro level and plans.
- Curriculum: replace presets with real maestro onboarding DSP stats; add backend endpoint.
- Gamification: connect Success screen to lesson completion events; add haptics.
- Payments (later): swap stubs with Razorpay/Stripe SDKs; enforce 14-day trial gating.
- QA: device testing for latency and visual polish; add unit tests for pitch utils, level calc, curriculum generator.

## File Pointers
- Entry: `app/index.tsx`
- Pitch hook: `src/hooks/usePitchDetection.ts`
- PCM bridge shell: `src/lib/audio/nativeAudio.ts`
- Active staff UI: `src/components/music/ActiveStaff.tsx`
- Plugin placeholder: `plugins/withPcmStreaming.js`
- Native audio notes: `src/lib/audio/README.md`
- Onset meter: `src/hooks/useOnsetMeter.ts`
