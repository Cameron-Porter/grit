import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import ExerciseMenuModal from '../../src/components/workout/ExerciseMenuModal';
import SetMenuModal from '../../src/components/workout/SetMenuModal';

jest.mock('../../src/components/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, visible }: any) => visible ? React.createElement(View, null, children) : null;
});

describe('workout action menus', () => {
  it.each([
    ['View history', 'onViewHistory'],
    ['Move up', 'onMoveUp'],
    ['Move down', 'onMoveDown'],
    ['Replace exercise', 'onReplace'],
    ['Add note', 'onNewNote'],
    ['Skip remaining sets', 'onSkipSets'],
    ['Exercise feedback', 'onJointPain'],
    ['Remove exercise', 'onRemove'],
  ] as const)('runs the %s exercise action and closes the menu', async (label, callbackName) => {
    const callbacks = {
      onClose: jest.fn(), onRemove: jest.fn(), onMoveUp: jest.fn(), onMoveDown: jest.fn(),
      onSkipSets: jest.fn(), onNewNote: jest.fn(), onJointPain: jest.fn(),
      onReplace: jest.fn(), onViewHistory: jest.fn(),
    };
    const { getByText } = await render(<ExerciseMenuModal visible {...callbacks} />);

    fireEvent.press(getByText(label));

    expect(callbacks[callbackName]).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['Skip set', 'onSkip'],
    ['Delete set', 'onDelete'],
  ] as const)('runs the %s set action and closes the menu', async (label, callbackName) => {
    const callbacks = { onClose: jest.fn(), onSkip: jest.fn(), onDelete: jest.fn() };
    const { getByText } = await render(<SetMenuModal visible {...callbacks} />);

    fireEvent.press(getByText(label));

    expect(callbacks[callbackName]).toHaveBeenCalledTimes(1);
    expect(callbacks.onClose).toHaveBeenCalledTimes(1);
  });
});
