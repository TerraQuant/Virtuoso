export type BlockType = "warmup" | "drill" | "song" | "boss";

export type CurriculumBlock = {
  type: BlockType;
  tempo: number;
  skill?: string;
  title?: string;
  difficulty?: "easy" | "medium" | "hard";
  targetScore?: number;
  arrangement?: "simplified" | "standard";
};

export type DayPlan = {
  week: number;
  day: number;
  blocks: CurriculumBlock[];
  adaptRules: { ifScoreBelow?: number; ifTimingOff?: boolean; action: string }[];
};

/**
 * Simple curriculum generator. Increase difficulty based on maestro level.
 */
export const generate12WeekCurriculum = (maestroLevel: number, focusAreas: string[] = []): DayPlan[] => {
  const clamped = Math.max(1, Math.min(100, maestroLevel));
  const baseTempo = 60 + Math.floor((clamped / 100) * 40);
  const difficulty: CurriculumBlock["difficulty"] =
    clamped < 30 ? "easy" : clamped < 70 ? "medium" : "hard";
  const emphasisTiming = focusAreas.some((f) => /time|groove|rhythm/i.test(f));
  const emphasisDynamics = focusAreas.some((f) => /dynamic|expression/i.test(f));
  const emphasisReading = focusAreas.some((f) => /reading|note/i.test(f));

  const plans: DayPlan[] = [];
  for (let week = 1; week <= 12; week++) {
    for (let day = 1; day <= 7; day++) {
      const tempoBump = Math.floor(((week - 1) * 5) / 2);
      plans.push({
        week,
        day,
        blocks: [
          { type: "warmup", tempo: baseTempo - 10 + tempoBump, skill: "five_finger" },
          {
            type: "drill",
            skill: emphasisTiming
              ? "timing"
              : emphasisReading
              ? "note_reading"
              : day % 2 === 0
              ? "left_hand"
              : "right_hand",
            tempo: baseTempo + tempoBump,
            difficulty
          },
          {
            type: "song",
            title: week <= 4 ? "Ode to Joy" : week <= 8 ? "Canon Lite" : "Minuet",
            tempo: baseTempo + tempoBump + 5,
            arrangement: difficulty === "easy" ? "simplified" : "standard"
          },
          {
            type: "boss",
            tempo: baseTempo + tempoBump + (emphasisTiming ? 4 : 8),
            targetScore: emphasisDynamics ? 0.86 : 0.82
          }
        ],
        adaptRules: [
          { ifScoreBelow: 0.75, action: "tempo-10" },
          { ifTimingOff: true, action: "simplify_arrangement" }
        ]
      });
    }
  }
  return plans;
};
