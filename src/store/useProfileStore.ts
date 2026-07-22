import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { upsertBodyWeight, upsertSettings, RemoteSettings } from '../api/userProfile';
import type { ExperienceLevel } from '../types/program';
import type { Theme } from '../utils/constants';

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
  theme: Theme;
  workoutRemindersEnabled: boolean;
  timerSoundEnabled: boolean;
  setBodyWeight: (weight: number) => void;
  hydrateBodyWeight: (weight: number) => void;
  setAutoMatchWeight: (value: boolean) => void;
  setUsePreferredEquipment: (value: boolean) => void;
  setPreferredEquipment: (types: string[]) => void;
  setExperienceLevel: (level: ExperienceLevel) => void;
  setTheme: (theme: Theme) => void;
  setWorkoutRemindersEnabled: (value: boolean) => void;
  setTimerSoundEnabled: (value: boolean) => void;
  hydrateSettings: (settings: RemoteSettings) => void;
  reset: () => void;
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
      theme: 'dark',
      workoutRemindersEnabled: false,
      timerSoundEnabled: true,
      setBodyWeight: (weight) => {
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const filtered = state.bodyWeightLog.filter((e) => e.date !== today);
          const newLog = [...filtered, { date: today, weight }]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-90);
          return { bodyWeight: weight, bodyWeightLog: newLog };
        });
        upsertBodyWeight(weight).catch(() => {});
      },
      hydrateBodyWeight: (weight) =>
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          const filtered = state.bodyWeightLog.filter((e) => e.date !== today);
          const newLog = [...filtered, { date: today, weight }]
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-90);
          return { bodyWeight: weight, bodyWeightLog: newLog };
        }),
      setAutoMatchWeight: (value) => {
        set({ autoMatchWeight: value });
        upsertSettings({ autoMatchWeight: value }).catch(() => {});
      },
      setUsePreferredEquipment: (value) => {
        set({ usePreferredEquipment: value });
        upsertSettings({ usePreferredEquipment: value }).catch(() => {});
      },
      setPreferredEquipment: (types) => {
        set({ preferredEquipment: types });
        upsertSettings({ preferredEquipment: types }).catch(() => {});
      },
      setExperienceLevel: (level) => set({ experienceLevel: level }),
      setTheme: (theme) => {
        set({ theme });
        upsertSettings({ theme }).catch(() => {});
      },
      setWorkoutRemindersEnabled: (value) => {
        set({ workoutRemindersEnabled: value });
        upsertSettings({ workoutRemindersEnabled: value }).catch(() => {});
      },
      setTimerSoundEnabled: (value) => set({ timerSoundEnabled: value }),
      hydrateSettings: (settings) => set({
        autoMatchWeight: settings.autoMatchWeight,
        usePreferredEquipment: settings.usePreferredEquipment,
        preferredEquipment: settings.preferredEquipment,
        theme: settings.theme as Theme,
        workoutRemindersEnabled: settings.workoutRemindersEnabled,
      }),
      reset: () => set({
        bodyWeight: null,
        bodyWeightLog: [],
        autoMatchWeight: false,
        usePreferredEquipment: false,
        preferredEquipment: ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'],
        experienceLevel: 'intermediate',
        workoutRemindersEnabled: false,
        timerSoundEnabled: true,
      }),
    }),
    {
      name: 'grit-profile-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
