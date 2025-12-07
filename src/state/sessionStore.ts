import { create } from "zustand";
import { DayPlan, generate12WeekCurriculum } from "../curriculum/generator";
import { computeLevel, PlayStats } from "../lib/maestro/level";
import { AiProfile } from "../lib/ai/geminiClient";
import { loadState, saveState } from "./persistence";

type SessionState = {
  kidLevelLabel: string | null;
  selfDescription: string;
  aiProfile: AiProfile | null;
  maestroLevel: number | null;
  levelSummary: string | null;
  curriculum: DayPlan[];
  setSelfReport: (label: string, description: string) => void;
  setAiProfile: (profile: AiProfile) => void;
  setMaestroLevelFromStats: (stats: PlayStats) => void;
  getDayPlan: (dayIndex: number) => DayPlan | null;
  hydrate: () => Promise<void>;
};

const levelBucket = (label: string | null) => {
  switch (label) {
    case "New Explorer":
      return 20;
    case "Sound Scout":
      return 30;
    case "Melody Maker":
      return 40;
    case "Groove Cadet":
      return 55;
    case "Rhythm Ranger":
      return 65;
    case "Chord Captain":
      return 75;
    case "Stage Star":
      return 85;
    case "Virtuoso Pro":
      return 95;
    default:
      return null;
  }
};

export const useSessionStore = create<SessionState>((set, get) => ({
  kidLevelLabel: null,
  selfDescription: "",
  aiProfile: null,
  maestroLevel: null,
  levelSummary: null,
  curriculum: [],
  setSelfReport: (label, description) => {
    set({ kidLevelLabel: label, selfDescription: description });
    const state = get();
    saveState({
      kidLevelLabel: label,
      selfDescription: description,
      aiProfile: state.aiProfile,
      maestroLevel: state.maestroLevel,
      levelSummary: state.levelSummary,
      curriculum: state.curriculum
    });
  },
  setAiProfile: (profile) => {
    set({ aiProfile: profile });
    const state = get();
    saveState({
      kidLevelLabel: state.kidLevelLabel,
      selfDescription: state.selfDescription,
      aiProfile: profile,
      maestroLevel: state.maestroLevel,
      levelSummary: state.levelSummary,
      curriculum: state.curriculum
    });
  },
  setMaestroLevelFromStats: (stats: PlayStats) => {
    const { level, summary } = computeLevel(stats);
    const focusAreas = get().aiProfile?.focusAreas || [];
    const bucket = levelBucket(get().kidLevelLabel);
    const blended = bucket ? Math.round(level * 0.6 + bucket * 0.4) : level;
    const finalLevel = bucket
      ? Math.max(bucket - 10, Math.min(bucket + 10, blended))
      : blended;
    const curriculum = generate12WeekCurriculum(finalLevel, focusAreas);
    set({ maestroLevel: finalLevel, levelSummary: summary, curriculum });
    const state = get();
    saveState({
      kidLevelLabel: state.kidLevelLabel,
      selfDescription: state.selfDescription,
      aiProfile: state.aiProfile,
      maestroLevel: finalLevel,
      levelSummary: summary,
      curriculum
    });
  },
  getDayPlan: (dayIndex: number) => {
    const { curriculum } = get();
    if (!curriculum.length) return null;
    // dayIndex is 1-based day number across 12 weeks (1..84)
    const idx = Math.max(0, Math.min(curriculum.length - 1, dayIndex - 1));
    return curriculum[idx];
  },
  hydrate: async () => {
    const persisted = await loadState();
    if (persisted) {
      set({
        kidLevelLabel: persisted.kidLevelLabel,
        selfDescription: persisted.selfDescription,
        aiProfile: persisted.aiProfile,
        maestroLevel: persisted.maestroLevel,
        levelSummary: persisted.levelSummary,
        curriculum: persisted.curriculum
      });
    }
  }
}));
