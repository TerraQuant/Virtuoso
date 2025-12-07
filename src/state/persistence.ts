import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "virtuoso_state_v1";

export type PersistedState = {
  kidLevelLabel: string | null;
  selfDescription: string;
  aiProfile: any | null;
  maestroLevel: number | null;
  levelSummary: string | null;
  curriculum: any[];
};

export const loadState = async (): Promise<PersistedState | null> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveState = async (state: PersistedState) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};
