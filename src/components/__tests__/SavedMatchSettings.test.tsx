import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchSettings } from '../../constants';
import { MatchSettings } from '../../zodSchemas';
import SavedMatchSettings from '../MatchSettingsMenu/SavedMatchSettings';

const savedFixture: MatchSettings = {
  ...defaultMatchSettings,
  homeTeamNameFull: 'Rovers',
  awayTeamNameFull: 'United',
  saveTitle: 'Rovers v United',
  saveDate: '2026-09-01T12:00:00.000Z',
  saveId: 'fixture-1',
};

let getSavedMatchSettings: ReturnType<typeof vi.fn>;
let setSavedMatchSettings: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getSavedMatchSettings = vi.fn().mockResolvedValue([]);
  setSavedMatchSettings = vi.fn().mockResolvedValue({ success: true });
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      getSavedMatchSettings,
      setSavedMatchSettings,
    } as unknown as Window['electronAPI'],
  });
});

async function renderSaved() {
  render(
    <SavedMatchSettings
      matchSettings={defaultMatchSettings}
      replaceMatchSettings={vi.fn()}
    />
  );
  // Let the mount-time fetch settle.
  await act(async () => {});
}

function dialogTitled(title: string) {
  const dialog = screen.getByText(title).closest('[role="dialog"]');
  if (!(dialog instanceof HTMLElement)) throw new Error(`No ${title} dialog`);
  return dialog;
}

describe('SavedMatchSettings saving', () => {
  it('suggests a translated default name from the current teams', async () => {
    await renderSaved();
    fireEvent.click(screen.getByText('Save Current Match Settings'));

    expect(screen.getByLabelText('Name')).toHaveValue('Home Team vs Away Team');
  });

  it('keeps the dialog and the typed name open with an error when the save fails, then allows a retry', async () => {
    setSavedMatchSettings.mockResolvedValueOnce({
      success: false,
      error: 'disk full',
    });
    await renderSaved();
    fireEvent.click(screen.getByText('Save Current Match Settings'));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Cup final' },
    });

    const dialog = dialogTitled('Save Match Settings?');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    });

    expect(
      within(dialog).getByText("Couldn't save the match settings. Try again.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Cup final');

    // Retry succeeds: the dialog closes and the list is refetched.
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    });
    expect(setSavedMatchSettings).toHaveBeenCalledTimes(2);
    expect(setSavedMatchSettings.mock.calls[1][0][0]).toMatchObject({
      saveTitle: 'Cup final',
    });
    await waitFor(() =>
      expect(screen.queryByText('Save Match Settings?')).not.toBeInTheDocument()
    );
    expect(getSavedMatchSettings).toHaveBeenCalledTimes(2);
  });

  it('treats a rejected IPC call as a failure too', async () => {
    setSavedMatchSettings.mockRejectedValueOnce(new Error('IPC gone'));
    await renderSaved();
    fireEvent.click(screen.getByText('Save Current Match Settings'));
    const dialog = dialogTitled('Save Match Settings?');

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    });

    expect(
      within(dialog).getByText("Couldn't save the match settings. Try again.")
    ).toBeInTheDocument();
  });

  it('only writes once when Save is double-clicked while the first save is in flight', async () => {
    let resolveSave: (value: { success: boolean }) => void = () => undefined;
    setSavedMatchSettings.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );
    await renderSaved();
    fireEvent.click(screen.getByText('Save Current Match Settings'));
    const saveButton = within(dialogTitled('Save Match Settings?')).getByRole(
      'button',
      { name: 'Save' }
    );

    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(saveButton).toBeDisabled();
    expect(setSavedMatchSettings).toHaveBeenCalledTimes(1);
    await act(async () => resolveSave({ success: true }));
  });
});

describe('SavedMatchSettings deleting', () => {
  it('keeps the confirmation open with an error when the delete fails', async () => {
    getSavedMatchSettings.mockResolvedValue([savedFixture]);
    setSavedMatchSettings.mockResolvedValueOnce({ success: false });
    await renderSaved();

    fireEvent.click(screen.getByText('Open Saved Match Settings'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = dialogTitled('Delete Saved Match Settings?');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    });

    expect(
      within(dialog).getByText(
        "Couldn't delete the saved match settings. Try again."
      )
    ).toBeInTheDocument();
    expect(setSavedMatchSettings).toHaveBeenCalledWith([]);
  });

  it('closes the confirmation only after a successful delete', async () => {
    getSavedMatchSettings
      .mockResolvedValueOnce([savedFixture])
      .mockResolvedValue([]);
    await renderSaved();

    fireEvent.click(screen.getByText('Open Saved Match Settings'));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = dialogTitled('Delete Saved Match Settings?');
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    });

    await waitFor(() =>
      expect(
        screen.queryByText('Delete Saved Match Settings?')
      ).not.toBeInTheDocument()
    );
    expect(screen.getByText('No Saved Match Settings')).toBeInTheDocument();
  });
});
