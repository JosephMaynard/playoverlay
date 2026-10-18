import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import ActionButton from '../ui/ActionButton';
import IconButton from '../ui/IconButton';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
}

export default function WideModal({ open, setOpen, title, children }: Props) {
  const { t } = useTranslation();
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 z-50 bg-overlay/60 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative w-full transform overflow-hidden rounded-2xl bg-surface px-4 pb-4 pt-5 text-left text-fg shadow-xl ring-1 ring-line transition-all sm:my-8 sm:max-w-2xl sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-2 pt-2 sm:block">
                  <IconButton
                    label={t('close')}
                    icon={<XMarkIcon className="h-6 w-6" aria-hidden="true" />}
                    onClick={() => setOpen(false)}
                  />
                </div>
                <Dialog.Title
                  as="h3"
                  className="text-lg font-semibold leading-7 text-fg sm:mr-10"
                >
                  {title}
                </Dialog.Title>
                <div className="py-2">{children}</div>

                <div className="mt-6 flex flex-col sm:flex-row-reverse">
                  <ActionButton
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={() => setOpen(false)}
                  >
                    {t('close')}
                  </ActionButton>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
