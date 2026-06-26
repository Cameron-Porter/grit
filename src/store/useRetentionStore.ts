import { create } from 'zustand';
import {
  getRetentionDashboard,
  archiveUser,
  restoreUser,
  permanentlyDeleteUser,
  setRetentionExempt,
  extendGracePeriod,
  runRetentionJob,
} from '../api/retention';
import { RetentionDashboardRow } from '../types/retention';

interface RetentionState {
  rows: RetentionDashboardRow[];
  loading: boolean;
  error: string | null;
  actionId: string | null; // user_id of in-flight action

  load: () => Promise<void>;
  archive: (userId: string) => Promise<void>;
  restore: (userId: string) => Promise<void>;
  permanentlyDelete: (userId: string) => Promise<void>;
  setExempt: (userId: string, exempt: boolean) => Promise<void>;
  extendGrace: (userId: string, days: number) => Promise<void>;
  triggerJob: () => Promise<Array<{ action_taken: string; affected_count: number }>>;
}

export const useRetentionStore = create<RetentionState>((set, get) => ({
  rows: [],
  loading: false,
  error: null,
  actionId: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const rows = await getRetentionDashboard();
      set({ rows, loading: false });
    } catch (e: unknown) {
      set({ loading: false, error: (e as Error).message ?? 'Failed to load retention data' });
    }
  },

  archive: async (userId) => {
    set({ actionId: userId, error: null });
    try {
      await archiveUser(userId);
      await get().load();
    } catch (e: unknown) {
      set({ error: (e as Error).message ?? 'Archive failed' });
    } finally {
      set({ actionId: null });
    }
  },

  restore: async (userId) => {
    set({ actionId: userId, error: null });
    try {
      await restoreUser(userId);
      await get().load();
    } catch (e: unknown) {
      set({ error: (e as Error).message ?? 'Restore failed' });
    } finally {
      set({ actionId: null });
    }
  },

  permanentlyDelete: async (userId) => {
    set({ actionId: userId, error: null });
    try {
      await permanentlyDeleteUser(userId);
      await get().load();
    } catch (e: unknown) {
      set({ error: (e as Error).message ?? 'Delete failed' });
    } finally {
      set({ actionId: null });
    }
  },

  setExempt: async (userId, exempt) => {
    set({ actionId: userId, error: null });
    try {
      await setRetentionExempt(userId, exempt);
      await get().load();
    } catch (e: unknown) {
      set({ error: (e as Error).message ?? 'Failed to update exemption' });
    } finally {
      set({ actionId: null });
    }
  },

  extendGrace: async (userId, days) => {
    set({ actionId: userId, error: null });
    try {
      await extendGracePeriod(userId, days);
      await get().load();
    } catch (e: unknown) {
      set({ error: (e as Error).message ?? 'Failed to extend grace period' });
    } finally {
      set({ actionId: null });
    }
  },

  triggerJob: async () => {
    set({ loading: true, error: null });
    try {
      const result = await runRetentionJob();
      await get().load();
      return result;
    } catch (e: unknown) {
      set({ loading: false, error: (e as Error).message ?? 'Job failed' });
      return [];
    }
  },
}));
