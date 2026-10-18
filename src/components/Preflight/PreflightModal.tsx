import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@playoverlay/core';
import Modal from '../Modal/Modal';
import PreflightCheckRow from './PreflightCheckRow';
import { PreflightResult } from '../../main-functions/preflight';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SUMMARY_BANNER_CLASS = {
  ok: 'bg-live-soft text-live-ink ring-1 ring-inset ring-live/40',
  warning: 'bg-warn-soft text-warn-ink ring-1 ring-inset ring-warn/40',
  error: 'bg-danger-soft text-danger-ink ring-1 ring-inset ring-danger/40',
} as const;

// A one-button "am I ready to go live?" checklist for the app's one
// non-technical operator. Purely a read-only diagnostic: everything it shows
// comes from main.ts's run-preflight handler, which only gathers and
// evaluates signals, it never moves a window, starts/stops a server, or
// changes match state. Re-runs every time the modal opens, so it always
// reflects the current setup rather than a stale snapshot from earlier in
// the session.
export default function PreflightModal({ open, setOpen }: Props) {
  const { t } = useTranslation();
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const runPreflight = () => {
    if (!window?.electronAPI) return;
    setLoading(true);
    setLoadError(false);
    window.electronAPI
      .runPreflight()
      .then((preflightResult) => {
        setResult(preflightResult);
      })
      .catch((error: unknown) => {
        console.error('Failed to run preflight check:', error);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  };

  // Re-run on every open, not just the first mount, an operator can open
  // this, fix something (plug in the second display, re-enable OBS), close
  // it, and reopen expecting fresh results.
  useEffect(() => {
    if (open) runPreflight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const summaryText = (() => {
    if (!result) return null;
    if (result.summary.status === 'ok') {
      return t('preflight:modal.summary.allClear');
    }
    if (result.summary.status === 'error') {
      return t('preflight:modal.summary.problems', {
        count: result.summary.errorCount,
      });
    }
    return t('preflight:modal.summary.warnings', {
      count: result.summary.warningCount,
    });
  })();

  return (
    <Modal
      open={open}
      setOpen={setOpen}
      title={t('preflight:modal.title')}
      icon="rocket"
      actionButtonLabel={t('preflight:action.runAgain')}
      actionButtonColor="indigo"
      action={runPreflight}
    >
      <p className="text-sm text-muted">{t('preflight:modal.intro')}</p>

      {loading && !result && (
        <p className="mt-4 text-sm text-muted">
          {t('preflight:action.running')}
        </p>
      )}

      {loadError && (
        <p className="mt-4 text-sm font-medium text-danger">
          {t('preflight:modal.loadError')}
        </p>
      )}

      {result && (
        <>
          <div
            className={classNames(
              'mt-4 rounded-xl px-4 py-3 text-base font-semibold',
              SUMMARY_BANNER_CLASS[result.summary.status]
            )}
          >
            {summaryText}
          </div>
          <ul
            role="list"
            className="mt-2 max-h-[50vh] divide-y divide-line overflow-y-auto"
          >
            {result.checks.map((check) => (
              <PreflightCheckRow key={check.id} check={check} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
