import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { PreflightCheckResult } from '../../main-functions/preflight';

export interface Props {
  check: PreflightCheckResult;
}

const STATUS_ICON = {
  ok: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon,
} as const;

const STATUS_ICON_CLASS = {
  ok: 'text-green-600',
  warning: 'text-amber-500',
  error: 'text-red-600',
} as const;

// One row of the preflight checklist. Mostly a thin t(titleKey)/t(detailKey)
// pairing, the evaluator (main-functions/preflight.ts) already decided the
// status and which keys apply, this component only renders it.
//
// The missingAssets check is the one exception: its detailData carries
// booleans for the two team logos rather than pre-built English labels,
// since the evaluator is Electron/fs-only and has no i18n access, "home team
// logo"/"away team logo" is app UI copy, unlike a custom screen's title
// (operator-authored free text, passed straight through untranslated, same
// convention as team names elsewhere in the app). So this is the one place
// that assembles the final comma-joined list, using the same `t` every other
// row already has in scope.
export default function PreflightCheckRow({ check }: Props) {
  const { t } = useTranslation();
  const Icon = STATUS_ICON[check.status];

  let detailData = check.detailData;
  if (check.id === 'missingAssets' && check.detailData) {
    const labels = [
      check.detailData.homeTeamLogoMissing
        ? t('preflight:checks.missingAssets.homeLogo')
        : null,
      check.detailData.awayTeamLogoMissing
        ? t('preflight:checks.missingAssets.awayLogo')
        : null,
      check.detailData.screenTitles || null,
    ].filter((label): label is string => Boolean(label));
    detailData = { ...check.detailData, titles: labels.join(', ') };
  }

  return (
    <li className="flex gap-x-3 py-3">
      <Icon
        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${STATUS_ICON_CLASS[check.status]}`}
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-medium text-gray-900">{t(check.titleKey)}</p>
        <p className="mt-0.5 text-sm text-gray-500">
          {t(check.detailKey, detailData)}
        </p>
      </div>
    </li>
  );
}
