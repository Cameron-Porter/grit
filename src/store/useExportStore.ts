import * as Sentry from '@sentry/react-native';
import { create } from 'zustand';
import { runWorkoutExport } from '../services/export/exportService';
import { useAuthStore } from './useAuthStore';
import { ExportStage } from '../services/export/types';

interface ExportState {
  stage: ExportStage;
  message: string;
  progress: number;
  error: string | null;
  startExport: () => Promise<void>;
  reset: () => void;
}

export const useExportStore = create<ExportState>((set, get) => ({
  stage: 'idle',
  message: '',
  progress: 0,
  error: null,

  startExport: async () => {
    if (get().stage === 'running') return;
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ stage: 'running', message: 'Starting export…', progress: 0, error: null });

    try {
      await runWorkoutExport(user, {
        onProgress: (message, progress) => set({ message, progress }),
      });
      set({ stage: 'done', message: 'Export complete', progress: 1 });
    } catch (e: any) {
      Sentry.captureException(e, { tags: { context: 'workoutExport' } });
      console.error('[Export] Export failed:', e);
      set({ stage: 'error', error: 'Export failed. Please try again.', message: 'Export failed' });
    }
  },

  reset: () => set({ stage: 'idle', message: '', progress: 0, error: null }),
}));
