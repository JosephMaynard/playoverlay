import {
  ExclamationTriangleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { classNames } from '@playoverlay/core';
import logo from '../../assets/playoverlay-logo.svg';

export type Icon =
  'warning' | 'clock' | 'adjust' | 'edit' | 'playoverlay-logo' | 'rocket';

export interface Props {
  icon: Icon;
}

const circleClassName =
  'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full';

const iconClassName = 'h-6 w-6';

const accentIcons = {
  clock: ClockIcon,
  adjust: AdjustmentsHorizontalIcon,
  edit: PencilIcon,
  rocket: RocketLaunchIcon,
} as const;

export default function ModalIcon({ icon }: Props) {
  const { t } = useTranslation();
  if (icon === 'warning') {
    return (
      <div className={classNames(circleClassName, 'bg-danger-soft sm:mx-0')}>
        <ExclamationTriangleIcon
          className={classNames(iconClassName, 'text-danger')}
          aria-hidden="true"
        />
      </div>
    );
  }
  if (icon === 'playoverlay-logo') {
    return (
      <div className={classNames(circleClassName, 'sm:mx-0')}>
        <img className="h-8 w-8" src={logo} alt={t('common:logoAlt')} />
      </div>
    );
  }
  // Every other icon is a neutral prompt, so they share the accent circle.
  const AccentIcon = accentIcons[icon];
  if (AccentIcon) {
    return (
      <div className={classNames(circleClassName, 'bg-accent-soft sm:mx-0')}>
        <AccentIcon
          className={classNames(iconClassName, 'text-accent')}
          aria-hidden="true"
        />
      </div>
    );
  }
  return <div className={classNames(circleClassName, 'bg-accent-soft')} />;
}
