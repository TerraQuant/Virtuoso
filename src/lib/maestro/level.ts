export type PlayStats = {
  pitchAccuracy: number; // 0-1
  rhythmAccuracy: number; // 0-1
  tempoStability: number; // 0-1
  rangeCoverage: number; // 0-1
  leftRightBalance: number; // 0-1
  retryPenalty: number; // 0-1 (higher = worse)
};

export type LevelResult = { level: number; summary: string };

export const computeLevel = (s: PlayStats): LevelResult => {
  const w = {
    pitch: 0.35,
    rhythm: 0.3,
    tempo: 0.15,
    range: 0.1,
    balance: 0.05,
    retry: 0.05
  };

  const raw =
    s.pitchAccuracy * w.pitch +
    s.rhythmAccuracy * w.rhythm +
    s.tempoStability * w.tempo +
    s.rangeCoverage * w.range +
    s.leftRightBalance * w.balance +
    (1 - s.retryPenalty) * w.retry;

  const level = Math.max(1, Math.min(100, Math.round(raw * 100)));

  const reasons: string[] = [];
  reasons.push(s.pitchAccuracy > 0.9 ? "Great pitch recognition." : "Work on matching pitch.");
  if (s.rhythmAccuracy < 0.75) reasons.push("Tighten timing.");
  if (s.tempoStability < 0.7) reasons.push("Keep tempo steady.");
  if (s.rangeCoverage < 0.6) reasons.push("Expand hand range.");
  if (s.leftRightBalance < 0.7) reasons.push("Balance both hands.");
  if (s.retryPenalty > 0.5) reasons.push("Fewer retries will boost you.");

  return { level, summary: `Level ${level}: ${reasons.join(" ")}` };
};
