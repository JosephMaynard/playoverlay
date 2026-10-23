import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { keyboardEventToAccelerator } from '@playoverlay/core';
import ActionButton from '../ui/ActionButton';

export interface Props {
  label: string;
  accelerator: string;
  isRecording: boolean;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onChange: (accelerator: string) => void;
  onReset: () => void;
  isDefault: boolean;
  // Error surfaced by the parent (e.g. "already assigned elsewhere"), takes
  // priority over the row's own key-capture validation error.
  externalError?: string | null;
}

// Turns an Electron accelerator like "CommandOrControl+Shift+H" into the
// friendlier "Cmd/Ctrl+Shift+H" shown in the UI. A macOS binding recorded
// with the Control key itself ("Control+Shift+H") reads as "Ctrl+Shift+H".
function formatAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) =>
      part === 'CommandOrControl'
        ? 'Cmd/Ctrl'
        : part === 'Control'
          ? 'Ctrl'
          : part
    )
    .join('+');
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

    const result = keyboardEventToAccelerator({
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      key: event.key,
      code: event.code,
    });

    if ('rejection' in result) {
      const shortcut = result.accelerator
        ? formatAccelerator(result.accelerator)
        : '';
      switch (result.rejection) {
        case 'modifierOnly':
          return;
        case 'needModifier':
          setError(t('settings:appMenu.keyboardShortcutRow.needModifier'));
          return;
        case 'metaKeyUnsupported':
          setError(t('settings:appMenu.keyboardShortcutRow.metaKey'));
          return;
        case 'reservedUndoRedo':
          setError(
            t('settings:appMenu.keyboardShortcutRow.reservedUndoRedo', {
              shortcut,
            })
          );
          return;
        case 'reservedEditing':
          setError(
            t('settings:appMenu.keyboardShortcutRow.reservedEditing', {
              shortcut,
            })
          );
          return;
        case 'reservedAppWindow':
          setError(
            t('settings:appMenu.keyboardShortcutRow.reservedAppWindow', {
              shortcut,
            })
          );
          return;
        default:
          setError(t('settings:appMenu.keyboardShortcutRow.invalidKey'));
          return;
      }
    }

    onChange(result.accelerator);
  };

  return (
    // Wraps on a narrow drawer so the label keeps its line and the 48px
    // buttons never squeeze it.
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <span className="text-base font-medium text-fg">{label}</span>
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
            className="flex min-h-12 items-center rounded bg-accent-soft px-3 text-sm font-medium text-fg ring-2 ring-inset ring-accent focus:outline-none"
          >
            {externalError ||
              error ||
              t('settings:appMenu.keyboardShortcutRow.pressKeys')}
          </div>
        ) : (
          <>
            <kbd className="rounded bg-surface-2 px-2.5 py-1.5 font-mono text-sm text-fg ring-1 ring-inset ring-line">
              {formatAccelerator(accelerator)}
            </kbd>
            <ActionButton size="md" onClick={onStartRecording}>
              {t('settings:appMenu.keyboardShortcutRow.change')}
            </ActionButton>
            <ActionButton size="md" disabled={isDefault} onClick={onReset}>
              {t('reset')}
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
}
