import { Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { useTranslation } from 'react-i18next';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';

export interface Props {
  title: string;
  text: string;
  icon: React.ReactNode;
  buttonText?: string;
  buttonOnClick?: () => void;
  // Called when the notification is dismissed via its close (X) button, as
  // distinct from taking its action. Not called when the action button fires.
  onClose?: () => void;
}

export default function AppNotification({
  title,
  text,
  icon,
  buttonText,
  buttonOnClick,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(true);

  // The fixed stacking container lives in the caller (Dashboard) so that
  // multiple notifications stack instead of rendering on top of each other.
  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-md bg-surface text-fg shadow-2xl ring-1 ring-line">
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">{icon}</div>
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className="text-base font-semibold text-fg">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
              {buttonText && buttonOnClick && (
                <div className="pt-4 text-right">
                  <ActionButton
                    variant="primary"
                    size="md"
                    onClick={() => {
                      buttonOnClick();
                      setShow(false);
                    }}
                  >
                    {buttonText}
                  </ActionButton>
                </div>
              )}
            </div>
            <div className="-mr-2 -mt-2 ml-2 flex flex-shrink-0">
              <IconButton
                label={t('common:close')}
                icon={<XMarkIcon className="h-5 w-5" aria-hidden="true" />}
                onClick={() => {
                  setShow(false);
                  onClose?.();
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
}
