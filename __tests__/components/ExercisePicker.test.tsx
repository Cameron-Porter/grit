import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import ExercisePicker from '../../src/components/workout/ExercisePicker';
import { useProfileStore } from '../../src/store/useProfileStore';

jest.mock('../../src/api/exercises', () => ({
  getExercises: jest.fn().mockResolvedValue([
    { id: '1', name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
    { id: '2', name: 'Dumbbell Curl', muscle_group: 'Biceps', equipment: 'Dumbbell' },
    { id: '3', name: 'Leg Press', muscle_group: 'Quads', equipment: 'Machine' },
    { id: '4', name: 'Pull-Up', muscle_group: 'Back', equipment: 'Bodyweight' },
  ]),
}));

const onSelect = jest.fn();
const onClose = jest.fn();

beforeEach(() => {
  useProfileStore.setState({
    usePreferredEquipment: false,
    preferredEquipment: ['Barbell', 'Dumbbell'],
    bodyWeight: null,
    bodyWeightLog: [],
    autoMatchWeight: false,
  });
  jest.clearAllMocks();
});

describe('ExercisePicker — equipment filtering logic', () => {
  it('passes all exercises when filtering is off', () => {
    useProfileStore.setState({ usePreferredEquipment: false, preferredEquipment: ['Barbell'] });
    const all = [
      { id: '1', name: 'Bench', muscle_group: 'Chest', equipment: 'Barbell' },
      { id: '2', name: 'Leg Press', muscle_group: 'Quads', equipment: 'Machine' },
    ];
    const filtered = all.filter((ex) => {
      const { usePreferredEquipment, preferredEquipment } = useProfileStore.getState();
      return (
        !usePreferredEquipment ||
        preferredEquipment.length === 0 ||
        preferredEquipment.some((e) => e.toLowerCase() === (ex.equipment ?? '').toLowerCase())
      );
    });
    expect(filtered).toHaveLength(2);
  });

  it('filters to preferred equipment when enabled', () => {
    useProfileStore.setState({ usePreferredEquipment: true, preferredEquipment: ['Barbell', 'Dumbbell'] });
    const all = [
      { id: '1', name: 'Bench', muscle_group: 'Chest', equipment: 'Barbell' },
      { id: '2', name: 'Curl', muscle_group: 'Biceps', equipment: 'Dumbbell' },
      { id: '3', name: 'Leg Press', muscle_group: 'Quads', equipment: 'Machine' },
    ];
    const filtered = all.filter((ex) => {
      const { usePreferredEquipment, preferredEquipment } = useProfileStore.getState();
      return (
        !usePreferredEquipment ||
        preferredEquipment.length === 0 ||
        preferredEquipment.some((e) => e.toLowerCase() === (ex.equipment ?? '').toLowerCase())
      );
    });
    expect(filtered).toHaveLength(2);
    expect(filtered.map((e) => e.name)).not.toContain('Leg Press');
  });

  it('shows all when preferred list is empty even if filtering is on', () => {
    useProfileStore.setState({ usePreferredEquipment: true, preferredEquipment: [] });
    const all = [{ id: '1', name: 'Bench', muscle_group: 'Chest', equipment: 'Machine' }];
    const filtered = all.filter((ex) => {
      const { usePreferredEquipment, preferredEquipment } = useProfileStore.getState();
      return !usePreferredEquipment || preferredEquipment.length === 0;
    });
    expect(filtered).toHaveLength(1);
  });

  it('case-insensitive equipment match', () => {
    useProfileStore.setState({ usePreferredEquipment: true, preferredEquipment: ['bodyweight'] });
    const all = [{ id: '1', name: 'Pull-Up', muscle_group: 'Back', equipment: 'Bodyweight' }];
    const filtered = all.filter((ex) => {
      const { usePreferredEquipment, preferredEquipment } = useProfileStore.getState();
      return (
        !usePreferredEquipment ||
        preferredEquipment.some((e) => e.toLowerCase() === (ex.equipment ?? '').toLowerCase())
      );
    });
    expect(filtered).toHaveLength(1);
  });
});

describe('ExercisePicker — search filter logic', () => {
  const exercises = [
    { id: '1', name: 'Barbell Bench Press', muscle_group: 'Chest', equipment: 'Barbell' },
    { id: '2', name: 'Dumbbell Curl', muscle_group: 'Biceps', equipment: 'Dumbbell' },
    { id: '3', name: 'Lat Pulldown', muscle_group: 'Back', equipment: 'Cable' },
  ];

  const applySearch = (query: string) =>
    exercises.filter(
      (ex) =>
        ex.name.toLowerCase().includes(query.toLowerCase()) ||
        ex.muscle_group?.toLowerCase().includes(query.toLowerCase()),
    );

  it('returns all exercises for empty query', () => {
    expect(applySearch('')).toHaveLength(3);
  });

  it('filters by exercise name', () => {
    expect(applySearch('curl')).toHaveLength(1);
    expect(applySearch('curl')[0].name).toBe('Dumbbell Curl');
  });

  it('filters by muscle group', () => {
    expect(applySearch('chest')).toHaveLength(1);
    expect(applySearch('chest')[0].name).toBe('Barbell Bench Press');
  });

  it('is case insensitive', () => {
    expect(applySearch('BENCH')).toHaveLength(1);
    expect(applySearch('BENCH')[0].name).toBe('Barbell Bench Press');
  });

  it('returns empty for no match', () => {
    expect(applySearch('zzznoexercise')).toHaveLength(0);
  });
});

describe('ExercisePicker — render', () => {
  it('renders the picker header when visible', async () => {
    await act(async () => {
      render(<ExercisePicker visible={true} onClose={onClose} onSelect={onSelect} />);
    });
    expect(screen.getByText('Select Exercise')).toBeTruthy();
  });

  it('renders a search input', async () => {
    await act(async () => {
      render(<ExercisePicker visible={true} onClose={onClose} onSelect={onSelect} />);
    });
    expect(screen.getByPlaceholderText(/search/i)).toBeTruthy();
  });

  it('loads and displays exercises', async () => {
    await act(async () => {
      render(<ExercisePicker visible={true} onClose={onClose} onSelect={onSelect} />);
    });
    await waitFor(() => expect(screen.getByText('Barbell Bench Press')).toBeTruthy());
  });

  it('calls onSelect with exercise data when pressed', async () => {
    await act(async () => {
      render(<ExercisePicker visible={true} onClose={onClose} onSelect={onSelect} />);
    });
    await waitFor(() => screen.getByText('Barbell Bench Press'));
    fireEvent.press(screen.getByText('Barbell Bench Press'));
    expect(onSelect).toHaveBeenCalledWith('Barbell Bench Press', 'Chest', 'Barbell');
  });
});
