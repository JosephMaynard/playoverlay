import { useTranslation } from 'react-i18next';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { classNames } from '@playoverlay/core';
import ActionButton from '../ui/ActionButton';
import PreflightCheckRow from './PreflightCheckRow';
import type { PreflightResult } from '../../main-functions/preflight';

export interface Props {
  result: PreflightResult | null;
  loading: boolean;
  loadError: boolean;
  run: () => void;
}

const SUMMARY_BANNER_CLASS = {
  ok: 'bg-live-soft text-live-ink ring-1 ring-inset ring-live/40',
  warning: 'bg-warn-soft text-warn-ink ring-1 ring-inset ring-warn/40',
  error: 'bg-danger-soft text-danger-ink ring-1 ring-inset ring-danger/40',
} as const;

// The "am I ready to go live?" checklist, in its own tab beside the screen
// switches. Useful before kick-off, never during the match, which is why
// it is a tab and not a button among the live controls.
export default function PreflightChecklist({
  result,
  loading,
  loadError,
  run,
}: Props) {
  const { t } = useTranslation();

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
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{t('preflight:modal.intro')}</p>
        <ActionButton
          size="sm"
          className="flex-shrink-0"
          disabled={loading}
          onClick={run}
          icon={<ArrowPathIcon className="h-5 w-5" aria-hidden="true" />}
        >
          {t('preflight:action.runAgain')}
        </ActionButton>
      </div>

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
              'mt-3 rounded px-4 py-2.5 text-base font-semibold',
              SUMMARY_BANNER_CLASS[result.summary.status]
            )}
          >
            {summaryText}
          </div>
          <ul role="list" className="mt-1 divide-y divide-line">
            {result.checks.map((check) => (
              <PreflightCheckRow key={check.id} check={check} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
