import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../Modal/Modal';
import PreflightCheckRow from './PreflightCheckRow';
import { PreflightResult } from '../../main-functions/preflight';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SUMMARY_BANNER_CLASS = {
  ok: 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200',
  warning: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
  error: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
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
      <p className="text-sm text-gray-500">{t('preflight:modal.intro')}</p>

      {loading && !result && (
        <p className="mt-4 text-sm text-gray-500">
          {t('preflight:action.running')}
        </p>
      )}

      {loadError && (
        <p className="mt-4 text-sm text-red-600">
          {t('preflight:modal.loadError')}
        </p>
      )}

      {result && (
        <>
          <div
            className={`mt-4 rounded-md px-3 py-2 text-sm font-medium ${SUMMARY_BANNER_CLASS[result.summary.status]}`}
          >
            {summaryText}
          </div>
          <ul
            role="list"
            className="mt-2 max-h-[50vh] divide-y divide-gray-100 overflow-y-auto"
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
