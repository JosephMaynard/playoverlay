import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ColourPicker from '../ColorPicker/ColorPicker';

describe('ColourPicker', () => {
  it('calls onChange with the selected colour', () => {
    const onChange = vi.fn();
    render(
      <ColourPicker
        label="Home background"
        value="#000000"
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText('Home background'), {
      target: { value: '#ff0000' },
    });

    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });

  it('warns when the selected colour is too close to the key colour', () => {
    render(
      <ColourPicker
        label="Away background"
        value="#000000"
        keyColour="#000001"
        onChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(/This colour may be too close to the key colour/)
    ).toBeInTheDocument();
  });

  it('disables the input when requested', () => {
    render(
      <ColourPicker
        disabled
        label="Disabled colour"
        value="#000000"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Disabled colour')).toBeDisabled();
  });
});
