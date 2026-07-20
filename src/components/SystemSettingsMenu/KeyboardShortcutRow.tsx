import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keyboardEventToAccelerator } from '../../utils';

export interface Props {
  label: string;
  accelerator: string;
  isRecording: boolean;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onChange: (accelerator: string) => void;
  onReset: () => void;
  isDefault: boolean;
  // Error surfaced by the parent (e.g. "already assigned elsewhere") — takes
  // priority over the row's own key-capture validation error.
  externalError?: string | null;
}

// Turns an Electron accelerator like "CommandOrControl+Shift+H" into the
// friendlier "Cmd/Ctrl+Shift+H" shown in the UI.
function formatAccelerator(accelerator: string): string {
  return accelerator.replace('CommandOrControl', 'Cmd/Ctrl');
}

export default function KeyboardShortcutRow({
  label,
  accelerator,
  isRecording,
  onStartRecording,
  onCancelRecording,
  onChange,
  onReset,
  isDefault,
  externalError,
}: Props) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRecording) {
      setError(null);
      recorderRef.current?.focus();
    }
  }, [isRecording]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Swallow the keydown entirely so it can't fall through to the side
    // menu's own Escape-to-close handling, browser shortcuts, etc.
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      onCancelRecording();
      return;
    }

    // Wait for the real key of the chord rather than reacting to the
    // modifier keydown on its own.
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
      return;
    }

    const nextAccelerator = keyboardEventToAccelerator({
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      key: event.key,
      code: event.code,
    });

    if (!nextAccelerator) {
      setError(
        !event.metaKey && !event.ctrlKey && !event.altKey
          ? t('settings:appMenu.keyboardShortcutRow.needModifier')
          : t('settings:appMenu.keyboardShortcutRow.invalidKey')
      );
      return;
    }

    onChange(nextAccelerator);
  };

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <div className="flex items-center gap-2">
        {isRecording ? (
          <div
            ref={recorderRef}
            tabIndex={0}
            role="textbox"
            aria-label={t('settings:appMenu.keyboardShortcutRow.pressKeysFor', {
              label,
            })}
            onKeyDown={handleKeyDown}
            onBlur={onCancelRecording}
            className="rounded-md bg-indigo-50 px-2 py-1 text-sm text-indigo-700 ring-1 ring-inset ring-indigo-300 focus:outline-none"
          >
            {externalError ||
              error ||
              t('settings:appMenu.keyboardShortcutRow.pressKeys')}
          </div>
        ) : (
          <>
            <kbd className="rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-900 ring-1 ring-inset ring-gray-300">
              {formatAccelerator(accelerator)}
            </kbd>
            <button
              type="button"
              className="rounded-md bg-white px-2 py-1 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              onClick={onStartRecording}
            >
              {t('settings:appMenu.keyboardShortcutRow.change')}
            </button>
            <button
              type="button"
              disabled={isDefault}
              className="rounded-md bg-white px-2 py-1 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:text-gray-300"
              onClick={onReset}
            >
              {t('reset')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
