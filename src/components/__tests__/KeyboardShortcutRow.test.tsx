import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KeyboardShortcutRow from '../SystemSettingsMenu/KeyboardShortcutRow';

function renderRecordingRow() {
  const onChange = vi.fn();
  render(
    <KeyboardShortcutRow
      label="Home team scored"
      accelerator="CommandOrControl+Shift+H"
      isRecording
      onStartRecording={vi.fn()}
      onCancelRecording={vi.fn()}
      onChange={onChange}
      onReset={vi.fn()}
      isDefault
    />
  );
  const recorder = screen.getByRole('textbox', {
    name: 'Press keys for Home team scored',
  });
  return { onChange, recorder };
}

function pressLetter(
  recorder: HTMLElement,
  letter: string,
  modifiers: Partial<{
    ctrlKey: boolean;
    metaKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
  }>
) {
  fireEvent.keyDown(recorder, {
    key: letter.toLowerCase(),
    code: `Key${letter}`,
    ...modifiers,
  });
}

// jsdom reports an empty navigator.platform, which the recorder treats as
// Linux; the macOS cases fake a Mac renderer.
function fakeMacRenderer() {
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('KeyboardShortcutRow reserved chords', () => {
  it.each([
    [{ ctrlKey: true }, 'Z', 'Cmd/Ctrl+Z is used for undo and redo.'],
    [
      { ctrlKey: true, shiftKey: true },
      'Z',
      'Cmd/Ctrl+Shift+Z is used for undo and redo.',
    ],
    [
      { ctrlKey: true },
      'C',
      'Cmd/Ctrl+C is used for copy, cut, paste or select all.',
    ],
    [
      { ctrlKey: true },
      'V',
      'Cmd/Ctrl+V is used for copy, cut, paste or select all.',
    ],
    [
      { ctrlKey: true },
      'X',
      'Cmd/Ctrl+X is used for copy, cut, paste or select all.',
    ],
    [
      { ctrlKey: true },
      'A',
      'Cmd/Ctrl+A is used for copy, cut, paste or select all.',
    ],
    [{ ctrlKey: true }, 'Q', 'Cmd/Ctrl+Q quits or closes the app.'],
    [{ ctrlKey: true }, 'W', 'Cmd/Ctrl+W quits or closes the app.'],
  ])('refuses %o + %s and explains why', (modifiers, letter, message) => {
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, letter, modifiers);

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder).toHaveTextContent(message);
    expect(recorder).toHaveTextContent('Choose another shortcut.');
  });

  it('refuses Cmd+Z on macOS too', () => {
    fakeMacRenderer();
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, 'Z', { metaKey: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder).toHaveTextContent('Cmd/Ctrl+Z is used for undo and redo.');
  });

  it('refuses the Windows/Super key on Windows/Linux with an explanation', () => {
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, 'H', { metaKey: true, shiftKey: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder).toHaveTextContent(
      "The Windows/Super key can't be used. Use Ctrl or Alt."
    );
  });
});

describe('KeyboardShortcutRow modifier mapping', () => {
  it('saves Ctrl on Windows/Linux as CommandOrControl', () => {
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, 'H', { ctrlKey: true, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith('CommandOrControl+Shift+H');
  });

  it('saves Ctrl on macOS as Control, not as Cmd', () => {
    fakeMacRenderer();
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, 'H', { ctrlKey: true, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith('Control+Shift+H');
  });

  it('saves Cmd on macOS as CommandOrControl', () => {
    fakeMacRenderer();
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, 'H', { metaKey: true, shiftKey: true });

    expect(onChange).toHaveBeenCalledWith('CommandOrControl+Shift+H');
  });

  it('still asks for a modifier when only Shift is held', () => {
    const { onChange, recorder } = renderRecordingRow();

    pressLetter(recorder, 'H', { shiftKey: true });

    expect(onChange).not.toHaveBeenCalled();
    expect(recorder).toHaveTextContent(
      'Include Cmd/Ctrl or Alt in the shortcut.'
    );
  });
});

describe('KeyboardShortcutRow display', () => {
  it('shows a macOS Control binding as Ctrl', () => {
    render(
      <KeyboardShortcutRow
        label="Home team scored"
        accelerator="Control+Shift+H"
        isRecording={false}
        onStartRecording={vi.fn()}
        onCancelRecording={vi.fn()}
        onChange={vi.fn()}
        onReset={vi.fn()}
        isDefault={false}
      />
    );

    expect(screen.getByText('Ctrl+Shift+H')).toBeInTheDocument();
  });
});
