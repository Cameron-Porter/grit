import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ExperienceLevel } from '../types/program';

export interface BodyWeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
}

export const EQUIPMENT_TYPES = [
  'Machine',
  'Barbell',
  'Smith Machine',
  'Dumbbell',
  'Cable',
  'Freemotion',
  'Bodyweight',
  'Bodyweight Loadable',
  'Machine Assistance',
] as const;

interface ProfileState {
  bodyWeight: number | null;
  bodyWeightLog: BodyWeightEntry[];
  autoMatchWeight: boolean;
  usePreferredEquipment: boolean;
  preferredEquipment: string[];
  experienceLevel: ExperienceLevel;
  setBodyWeight: (weight: number) => void;
  setAutoMatchWeight: (value: boolean) => void;
  setUsePreferredEquipment: (value: boolean) => void;
  setPreferredEquipment: (types: string[]) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      bodyWeight: null,
      bodyWeightLog: [],
      autoMatchWeight: false,
      usePreferredEquipment: false,
      preferredEquipment: ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'],
      experienceLevel: 'intermediate',
      setBodyWeight: (weight) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const filtered = state.bodyWeightLog.filter((e) => e.date !== today);
          const newLog = [...filtered, { date: today, weight }]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-90);
          return { bodyWeight: weight, bodyWeightLog: newLog };
        }),
      setAutoMatchWeight: (value) => set({ autoMatchWeight: value }),
      setUsePreferredEquipment: (value) => set({ usePreferredEquipment: value }),
      setPreferredEquipment: (types) => set({ preferredEquipment: types }),
      setExperienceLevel: (level) => set({ experienceLevel: level }),
    }),
    {
      name: 'grit-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
