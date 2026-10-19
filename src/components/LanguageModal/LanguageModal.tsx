import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal/Modal';
import {
  supportedLanguages,
  LanguageCode,
  classNames,
  detectLanguage,
} from '@playoverlay/core';

export interface Props {
  // undefined = not yet chosen; the modal only ever shows in that state.
  // Passing the currently-set language (rather than a plain boolean) keeps
  // "when does this show" defined in exactly one place.
  language: LanguageCode | undefined;
  onConfirm: (language: LanguageCode) => void;
}

// First-run language picker. Renders on the control window only (App.tsx
// mounts it alongside Dashboard), DisplayApp.tsx never imports it, so it
// can never appear on the display window or a browser source. Shown only
// while appSettings.language is unset, pre-selected to the detected OS/
// browser locale; confirming is what actually sets the language (dismissing
// via Esc/backdrop/close just hides it for the rest of this session, it
// isn't a "reject a language" action, so it doesn't persist anything, and
// the picker will offer again on the next launch until the operator
// confirms a choice).
export default function LanguageModal({ language, onConfirm }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [selected, setSelected] = useState<LanguageCode>(() =>
    detectLanguage()
  );

  const open = language === undefined && !dismissed;

  return (
    <Modal
      open={open}
      setOpen={(nextOpen) => {
        if (!nextOpen) setDismissed(true);
      }}
      title={t('settings:language.modal.title')}
      actionButtonLabel={t('settings:language.modal.confirm')}
      actionButtonColor="indigo"
      action={() => onConfirm(selected)}
    >
      <p className="text-sm text-muted">
        {t('settings:language.modal.description')}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {supportedLanguages.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            aria-pressed={selected === code}
            onClick={() => setSelected(code)}
            className={classNames(
              'min-h-12 rounded-xl px-4 py-2 text-left text-base font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
              selected === code
                ? 'bg-accent-soft text-fg ring-2 ring-inset ring-accent'
                : 'bg-surface text-fg ring-1 ring-inset ring-line hover:bg-surface-2 hover:ring-line-strong'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
