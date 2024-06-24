import {
  ExclamationTriangleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';

export type Icon = 'warning' | 'clock' | 'adjust' | 'edit' | 'playoverlay-logo';

export interface Props {
  icon: Icon;
}

export default function ModalIcon({ icon }: Props) {
  if (icon === 'warning') {
    return (
      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
        <ExclamationTriangleIcon
          className="h-6 w-6 text-red-600"
          aria-hidden="true"
        />
      </div>
    );
  }
  if (icon === 'clock') {
    return (
      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
        <ClockIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
      </div>
    );
  }
  if (icon === 'adjust') {
    return (
      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
        <AdjustmentsHorizontalIcon
          className="h-6 w-6 text-indigo-600"
          aria-hidden="true"
        />
      </div>
    );
  }
  if (icon === 'edit') {
    return (
      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
        <PencilIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
      </div>
    );
  }
  if (icon === 'playoverlay-logo') {
    return (
      <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full  sm:mx-0 sm:h-10 sm:w-10">
        <img className="h-6 w-6" src={logo} alt="PlayOverlay logo" />
      </div>
    );
  }
  return (
    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100"></div>
  );
}
