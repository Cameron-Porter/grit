import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface BodyWeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

interface ProfileState {
  bodyWeight: number | null;
  bodyWeightLog: BodyWeightEntry[];
  setBodyWeight: (weight: number) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      bodyWeight: null,
      bodyWeightLog: [],
      setBodyWeight: (weight) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const filtered = state.bodyWeightLog.filter((e) => e.date !== today);
          const newLog = [...filtered, { date: today, weight }]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-90);
          return { bodyWeight: weight, bodyWeightLog: newLog };
        }),
    }),
    {
      name: 'grit-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
