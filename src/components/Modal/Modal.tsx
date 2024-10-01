import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import ModalIcon, { Icon } from './ModalIcon';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
  actionButtonColor?: 'red' | 'green' | 'indigo' | 'blue';
  actionButtonLabel?: string;
  action?: () => void;
  icon?: Icon;
}

export default function Modal({
  open,
  setOpen,
  title,
  children,
  actionButtonLabel,
  actionButtonColor = 'red',
  action,
  icon,
}: Props) {
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
          <div className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 transition-opacity" />
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
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  {icon && <ModalIcon icon={icon} />}
                  <div className="mt-3 flex-grow text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-gray-900"
                    >
                      {title}
                    </Dialog.Title>
                    <div className="mt-2">{children}</div>
                  </div>
                </div>
                <div className="mt-5 gap-3 sm:mt-4 sm:flex sm:flex-row sm:justify-end">
                  {action && actionButtonLabel && (
                    <button
                      type="button"
                      className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${actionButtonColor === 'red' ? 'bg-red-600 hover:bg-red-500' : ''}${actionButtonColor === 'green' ? 'bg-green-600 hover:bg-green-500' : ''}${actionButtonColor === 'indigo' ? 'bg-indigo-600 hover:bg-indigo-500' : ''}${actionButtonColor === 'blue' ? 'bg-blue-600 hover:bg-blue-500' : ''} sm:w-auto`}
                      onClick={action}
                    >
                      {actionButtonLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
