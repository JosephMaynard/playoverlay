import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultMatchState } from '../../constants';
import { useMatchStateStore } from '../../store/matchState';
import { CustomScreen, MatchState } from '../../types';
import CustomScreensMenu from '../CustomScreens/CustomScreensMenu';

const fullScreenGraphic: CustomScreen = {
  title: 'Sponsor board',
  filePath: '/images/sponsor.png',
  url: 'file:///images/sponsor.png',
  type: 'screen',
  overlayLinks: [],
};
const overlayGraphic: CustomScreen = {
  title: 'Club crest',
  filePath: '/images/crest.png',
  url: 'file:///images/crest.png',
  type: 'overlay',
  overlayLinks: ['scoreBug'],
};
const idleGraphic: CustomScreen = {
  title: 'Half-time card',
  filePath: '/images/half-time.png',
  url: 'file:///images/half-time.png',
  type: 'screen',
  overlayLinks: [],
};

let deleteImage: ReturnType<typeof vi.fn>;
let setCustomScreens: ReturnType<typeof vi.fn>;

beforeEach(() => {
  deleteImage = vi.fn().mockResolvedValue(true);
  setCustomScreens = vi.fn().mockResolvedValue({ success: true });
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      getVersion: () => '0.21.0-test',
      deleteImage,
      setCustomScreens,
    } as unknown as Window['electronAPI'],
  });
});

afterEach(() => {
  useMatchStateStore.setState({ matchState: { ...defaultMatchState } });
});

// Sets the store directly (not via setMatchState) so no IPC is involved.
function setMatchState(matchState: Partial<MatchState>) {
  useMatchStateStore.setState({
    matchState: { ...defaultMatchState, ...matchState },
  });
}

function renderMenu() {
  const fetchScreens = vi.fn();
  render(
    <CustomScreensMenu
      open
      setOpen={() => undefined}
      keyColour="#0000FF"
      customGraphics={[fullScreenGraphic, overlayGraphic, idleGraphic]}
      fetchScreens={fetchScreens}
    />
  );
  return { fetchScreens };
}

function rowFor(title: string) {
  const row = screen.getByText(title).closest('li');
  if (!row) throw new Error(`No row for ${title}`);
  return row;
}

function dialogTitled(title: string) {
  const dialog = screen.getByText(title).closest('[role="dialog"]');
  if (!(dialog instanceof HTMLElement)) throw new Error(`No ${title} dialog`);
  return dialog;
}

describe('CustomScreensMenu on-air indicator', () => {
  it('marks the full-screen graphic and the active overlay as on air, and nothing else', () => {
    setMatchState({
      displayScreen: 'custom',
      customScreenImageUrl: 'file:///images/sponsor.png',
      overlays: [overlayGraphic],
    });
    renderMenu();

    expect(within(rowFor('Sponsor board')).getByText('On air')).toBeVisible();
    expect(within(rowFor('Club crest')).getByText('On air')).toBeVisible();
    expect(
      within(rowFor('Half-time card')).queryByText('On air')
    ).not.toBeInTheDocument();
  });

  it('does not mark a full-screen graphic that is selected but not the screen on air', () => {
    setMatchState({
      displayScreen: 'scoreBug',
      customScreenImageUrl: 'file:///images/sponsor.png',
    });
    renderMenu();

    expect(screen.queryByText('On air')).not.toBeInTheDocument();
  });

  it('does not treat two missing file paths as the same graphic', () => {
    const brokenGraphic: CustomScreen = {
      ...idleGraphic,
      title: 'Missing file',
      filePath: null,
      url: null,
    };
    setMatchState({
      overlays: [{ ...overlayGraphic, filePath: null }],
    });
    render(
      <CustomScreensMenu
        open
        setOpen={() => undefined}
        keyColour="#0000FF"
        customGraphics={[brokenGraphic]}
        fetchScreens={vi.fn()}
      />
    );

    expect(screen.queryByText('On air')).not.toBeInTheDocument();
  });

  it('warns in the delete confirmation that an on-air graphic will be taken off air', () => {
    setMatchState({ overlays: [overlayGraphic] });
    renderMenu();

    fireEvent.click(
      within(rowFor('Club crest')).getByRole('button', { name: 'Delete' })
    );

    expect(
      within(dialogTitled('Delete custom screen?')).getByText(
        'This graphic is on air right now. Deleting it will take it off air.'
      )
    ).toBeInTheDocument();
  });

  it('gives no on-air warning when deleting a graphic that is not on air', () => {
    renderMenu();

    fireEvent.click(
      within(rowFor('Half-time card')).getByRole('button', { name: 'Delete' })
    );

    expect(
      screen.queryByText(
        'This graphic is on air right now. Deleting it will take it off air.'
      )
    ).not.toBeInTheDocument();
  });
});

describe('CustomScreensMenu delete', () => {
  it('keeps the confirmation open with an error when the delete fails', async () => {
    deleteImage.mockResolvedValueOnce(false);
    const { fetchScreens } = renderMenu();
    fireEvent.click(
      within(rowFor('Half-time card')).getByRole('button', { name: 'Delete' })
    );
    const dialog = dialogTitled('Delete custom screen?');

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Delete custom screen' })
      );
    });

    expect(deleteImage).toHaveBeenCalledWith(idleGraphic.filePath);
    expect(
      within(dialog).getByText("Couldn't delete the graphic. Try again.")
    ).toBeInTheDocument();
    expect(fetchScreens).not.toHaveBeenCalled();
  });

  it('closes the confirmation and refreshes the list once the delete succeeds', async () => {
    const { fetchScreens } = renderMenu();
    fireEvent.click(
      within(rowFor('Half-time card')).getByRole('button', { name: 'Delete' })
    );

    await act(async () => {
      fireEvent.click(
        within(dialogTitled('Delete custom screen?')).getByRole('button', {
          name: 'Delete custom screen',
        })
      );
    });

    expect(fetchScreens).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.queryByText('Delete custom screen?')
      ).not.toBeInTheDocument()
    );
  });
});

describe('CustomScreensMenu edit', () => {
  it('keeps the edit dialog and draft with an error when saving fails', async () => {
    setCustomScreens.mockResolvedValueOnce({ success: false, error: 'EACCES' });
    const { fetchScreens } = renderMenu();
    fireEvent.click(
      within(rowFor('Half-time card')).getByRole('button', { name: 'Edit' })
    );
    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'Half-time (new)' },
    });
    const dialog = dialogTitled('Edit Custom Graphic');

    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Save changes' })
      );
    });

    expect(
      within(dialog).getByText("Couldn't save your changes. Try again.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Half-time (new)');
    expect(fetchScreens).not.toHaveBeenCalled();

    // Retry succeeds and closes the dialog.
    await act(async () => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Save changes' })
      );
    });
    expect(setCustomScreens).toHaveBeenLastCalledWith([
      fullScreenGraphic,
      overlayGraphic,
      { ...idleGraphic, title: 'Half-time (new)' },
    ]);
    expect(fetchScreens).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByText('Edit Custom Graphic')).not.toBeInTheDocument()
    );
  });
});
