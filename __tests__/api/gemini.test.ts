import {
  generateProgressiveOverload,
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

  it('throws on API error', async () => {
    mockError(401, 'Unauthorized');
    await expect(generateProgressiveOverload('hypertrophy', {}, 2, 4, [])).rejects.toThrow('Gemini 401');
  });

  it('throws when API key is missing', async () => {
    const original = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = '';
    await expect(generateProgressiveOverload('hypertrophy', {}, 2, 4, [])).rejects.toThrow(
      'EXPO_PUBLIC_GEMINI_API_KEY is not set',
    );
    process.env.EXPO_PUBLIC_GEMINI_API_KEY = original;
  });

  it('RIR decreases week over week', async () => {
    mockResponse(overload);
    await generateProgressiveOverload('hypertrophy', {}, 3, 4, []);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt: string = body.contents[0].parts[0].text;
    expect(prompt).toContain('target RIR:1'); // week 3 of 4 → RIR = max(1, 4-3) = 1
  });

  it('sends the correct model endpoint', async () => {
    mockResponse(overload);
    await generateProgressiveOverload('hypertrophy', {}, 2, 4, []);
    const url = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(url).toContain('gemini-flash-latest');
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
