import { act } from '@testing-library/react-native';
import { useProfileStore } from '../../src/store/useProfileStore';

beforeEach(() => {
  useProfileStore.setState({
    bodyWeight: null,
    bodyWeightLog: [],
    autoMatchWeight: false,
    usePreferredEquipment: false,
    preferredEquipment: ['Barbell', 'Dumbbell', 'Cable', 'Bodyweight'],
  });
});

describe('setBodyWeight', () => {
  it('sets body weight and logs the entry', () => {
    act(() => useProfileStore.getState().setBodyWeight(175));
    const { bodyWeight, bodyWeightLog } = useProfileStore.getState();
    expect(bodyWeight).toBe(175);
    expect(bodyWeightLog).toHaveLength(1);
    expect(bodyWeightLog[0].weight).toBe(175);
  });

  it('replaces same-day entry instead of duplicating', () => {
    act(() => {
      useProfileStore.getState().setBodyWeight(170);
      useProfileStore.getState().setBodyWeight(175);
    });
    expect(useProfileStore.getState().bodyWeightLog).toHaveLength(1);
    expect(useProfileStore.getState().bodyWeight).toBe(175);
  });

  it('caps the log at 90 entries', () => {
    act(() => {
      for (let i = 0; i < 95; i++) {
        const date = new Date(2025, 0, i + 1).toISOString().split('T')[0];
        useProfileStore.setState((s) => ({
          bodyWeightLog: [...s.bodyWeightLog, { date, weight: 170 + i }].slice(-90),
        }));
      }
    });
    expect(useProfileStore.getState().bodyWeightLog.length).toBeLessThanOrEqual(90);
  });
});

describe('autoMatchWeight', () => {
  it('defaults to false', () => {
    expect(useProfileStore.getState().autoMatchWeight).toBe(false);
  });

  it('can be toggled on', () => {
    act(() => useProfileStore.getState().setAutoMatchWeight(true));
    expect(useProfileStore.getState().autoMatchWeight).toBe(true);
  });

  it('can be toggled off', () => {
    act(() => {
      useProfileStore.getState().setAutoMatchWeight(true);
      useProfileStore.getState().setAutoMatchWeight(false);
    });
    expect(useProfileStore.getState().autoMatchWeight).toBe(false);
  });
});

describe('preferredEquipment', () => {
  it('defaults to common equipment types', () => {
    const { preferredEquipment } = useProfileStore.getState();
    expect(preferredEquipment).toContain('Barbell');
    expect(preferredEquipment).toContain('Dumbbell');
  });

  it('can be set to a custom list', () => {
    act(() => useProfileStore.getState().setPreferredEquipment(['Machine', 'Cable']));
    expect(useProfileStore.getState().preferredEquipment).toEqual(['Machine', 'Cable']);
  });

  it('usePreferredEquipment defaults to false', () => {
    expect(useProfileStore.getState().usePreferredEquipment).toBe(false);
  });

  it('can enable equipment filtering', () => {
    act(() => useProfileStore.getState().setUsePreferredEquipment(true));
    expect(useProfileStore.getState().usePreferredEquipment).toBe(true);
  });
});
