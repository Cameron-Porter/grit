import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import RirPickerModal from '../../src/components/workout/RirPickerModal';

jest.mock('../../src/components/BottomSheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, visible }: any) => visible ? React.createElement(View, null, children) : null;
});

describe('RirPickerModal', () => {
  it('explains RIR in plain language and saves the selected effort', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const { getByText } = await render(
      <RirPickerModal visible prescribedRir={2} onSelect={onSelect} onClose={onClose} />,
    );

    expect(getByText('How many clean reps could you still have done?')).toBeTruthy();
    expect(getByText('Target: about 2 reps left')).toBeTruthy();

    fireEvent.press(getByText('2 reps'));

    expect(onSelect).toHaveBeenCalledWith(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
