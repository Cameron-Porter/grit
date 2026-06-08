import {
  generateProgressiveOverload,
  generateStarterSets,
  generateWorkoutSplit,
} from '../../src/api/gemini';

const mockResponse = (data: any) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }],
    }),
  }) as any;
};

const mockError = (status: number, body: string) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    text: async () => body,
  }) as any;
};

afterEach(() => jest.resetAllMocks());

describe('generateWorkoutSplit', () => {
  const split = [
    {
      dayIndex: 0,
      splitName: 'Push',
      exercises: [
        { name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' },
        { name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell' },
        { name: 'Tricep Pushdown', muscleGroup: 'Triceps', equipment: 'Cable' },
      ],
    },
  ];

  it('returns parsed split days on success', async () => {
    mockResponse(split);
    const result = await generateWorkoutSplit('hypertrophy', {}, 1, ['Monday']);
    expect(result).toHaveLength(1);
    expect(result[0].splitName).toBe('Push');
    expect(result[0].exercises).toHaveLength(3);
  });

  it('throws on API error', async () => {
    mockError(401, 'Unauthorized');
    await expect(generateWorkoutSplit('hypertrophy', {}, 1, ['Monday'])).rejects.toThrow('Gemini 401');
  });

  it('throws when API key is missing', async () => {
    const original = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = '';
    await expect(generateWorkoutSplit('hypertrophy', {}, 1, ['Monday'])).rejects.toThrow(
      'EXPO_PUBLIC_GEMINI_API_KEY is not set',
    );
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = original;
  });

  it('sends the correct model endpoint', async () => {
    mockResponse(split);
    await generateWorkoutSplit('hypertrophy', {}, 1, ['Monday']);
    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('gemini-flash-latest');
  });

  it('includes exercise ordering rules in the prompt', async () => {
    mockResponse(split);
    await generateWorkoutSplit('strength', { Chest: 'emphasize' }, 1, ['Monday']);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt: string = body.contents[0].parts[0].text;
    expect(prompt).toContain('Compound multi-joint first');
    expect(prompt).toContain('Chest before triceps');
  });

  it('includes persona matching the focus', async () => {
    mockResponse(split);
    await generateWorkoutSplit('strength', {}, 1, ['Monday']);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt: string = body.contents[0].parts[0].text;
    expect(prompt.toLowerCase()).toContain('strength');
  });
});

describe('generateStarterSets', () => {
  const targets = [
    { exerciseName: 'Barbell Bench Press', sets: 5, repsMin: 8, repsMax: 12, weightLbs: 0, rir: 3 },
    { exerciseName: 'Tricep Pushdown', sets: 4, repsMin: 10, repsMax: 15, weightLbs: 0, rir: 3 },
  ];

  it('returns parsed targets on success', async () => {
    mockResponse(targets);
    const result = await generateStarterSets(
      'hypertrophy',
      { Chest: 'emphasize' },
      [{ name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell' }],
    );
    expect(result).toHaveLength(2);
    expect(result[0].sets).toBe(5);
    expect(result[0].weightLbs).toBe(0);
  });

  it('throws on API error', async () => {
    mockError(403, 'Forbidden');
    await expect(
      generateStarterSets('hypertrophy', {}, [{ name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell' }]),
    ).rejects.toThrow();
  });

  it('prompt contains MANDATORY minimum set counts', async () => {
    mockResponse(targets);
    await generateStarterSets('hypertrophy', { Chest: 'emphasize' }, [
      { name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell' },
    ]);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt: string = body.contents[0].parts[0].text;
    expect(prompt).toContain('MANDATORY');
    expect(prompt).toContain('emphasize');
    expect(prompt).toContain('MINIMUM 4 sets');
  });

  it('all week-1 weights are 0', async () => {
    mockResponse(targets);
    const result = await generateStarterSets('hypertrophy', {}, [
      { name: 'Bench', muscleGroup: 'Chest', equipment: 'Barbell' },
    ]);
    result.forEach((t) => expect(t.weightLbs).toBe(0));
  });
});

describe('generateProgressiveOverload', () => {
  const overload = [
    { exerciseName: 'Barbell Bench Press', sets: 4, repsMin: 8, repsMax: 12, weightLbs: 135, rir: 2, rationale: 'Good pump last week' },
  ];

  it('returns overload targets on success', async () => {
    mockResponse(overload);
    const result = await generateProgressiveOverload('hypertrophy', {}, 2, 4, [
      {
        exerciseName: 'Barbell Bench Press',
        muscleGroup: 'Chest',
        sessions: [
          {
            dayLabel: 'Monday',
            sets: [{ weight: 130, reps: 10, completed: true }],
            feedback: { pump: 'Amazing', jointPain: 'None', volume: 'Just right', soreness: 'Not sore' },
          },
        ],
      },
    ]);
    expect(result[0].exerciseName).toBe('Barbell Bench Press');
    expect(result[0].rationale).toBeTruthy();
  });

  it('RIR decreases week over week', async () => {
    mockResponse(overload);
    await generateProgressiveOverload('hypertrophy', {}, 3, 4, []);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt: string = body.contents[0].parts[0].text;
    expect(prompt).toContain('target RIR:1'); // week 3 of 4 → RIR = max(1, 4-3) = 1
  });

  it('handles multi-session fatigue context in prompt', async () => {
    mockResponse(overload);
    await generateProgressiveOverload('hypertrophy', {}, 2, 4, [
      {
        exerciseName: 'Bench',
        muscleGroup: 'Chest',
        sessions: [
          { dayLabel: 'Mon', sets: [{ weight: 130, reps: 10, completed: true }], feedback: null },
          { dayLabel: 'Thu', sets: [{ weight: 130, reps: 8, completed: true }], feedback: null },
        ],
      },
    ]);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt: string = body.contents[0].parts[0].text;
    expect(prompt).toContain('2sess');
    expect(prompt).toContain('Mon');
    expect(prompt).toContain('Thu');
  });
});
