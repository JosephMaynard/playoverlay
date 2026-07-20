import {
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import LanguageModal from '../LanguageModal/LanguageModal';

describe('LanguageModal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows when language is unset, pre-selected to the detected locale', () => {
    vi.stubGlobal('navigator', { language: 'de-DE', languages: ['de-DE'] });
    render(<LanguageModal language={undefined} onConfirm={vi.fn()} />);

    expect(screen.getByText('Choose a language')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deutsch' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('is hidden once a language has been chosen', () => {
    render(<LanguageModal language="fr" onConfirm={vi.fn()} />);

    expect(screen.queryByText('Choose a language')).not.toBeInTheDocument();
  });

  it('calls onConfirm with the selected language when confirmed', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    vi.stubGlobal('navigator', { language: 'en-US', languages: ['en-US'] });
    render(<LanguageModal language={undefined} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Deutsch' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledWith('de');
  });

  it('dismissing without confirming hides the modal without calling onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LanguageModal language={undefined} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitForElementToBeRemoved(() =>
      screen.queryByText('Choose a language')
    );

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
