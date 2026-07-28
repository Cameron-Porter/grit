import { classifyMovement } from '../../src/data/movementClassMap';

describe('movementClassMap', () => {
  it.each([
    'Horizontal Press', 'Incline Press', 'Vertical Press',
    'Horizontal Pull', 'Vertical Pull', 'Quad Dominant', 'Hip Hinge', 'Glute Dominant',
  ])('classifies %s as compound', (category) => {
    expect(classifyMovement(category)).toBe('compound');
  });

  it.each([
    'Lateral Raise', 'Rear Delt', 'Elbow Flexion', 'Elbow Extension',
    'Calf Raise', 'Core', 'Knee Flexion', 'Trap/Shrug', 'Scapular Elevation',
    'Wrist Flexion', 'Wrist/Grip',
  ])('classifies %s as isolation', (category) => {
    expect(classifyMovement(category)).toBe('isolation');
  });

  it('classifies null, undefined, and unknown categories as unknown', () => {
    expect(classifyMovement(null)).toBe('unknown');
    expect(classifyMovement(undefined)).toBe('unknown');
    expect(classifyMovement('Some New Category')).toBe('unknown');
  });
});
