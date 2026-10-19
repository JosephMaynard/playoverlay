import { Fragment, useState } from 'react';
import { HeartIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { SUPPORT_URL } from '@playoverlay/core';
import { Dialog, Transition } from '@headlessui/react';
import { useTranslation } from 'react-i18next';
import IconButton from '../ui/IconButton';

export interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children?: React.ReactNode;
}

// The running app's version, or null when it can't be read (e.g. no
// preload bridge in a browser preview or a failed IPC call). It used to fall
// back to a made-up '1.0.0', which is worse than showing nothing when an
// operator reads it out to support.
function readAppVersion(): string | null {
  try {
    return window?.electronAPI?.getVersion() || null;
  } catch {
    return null;
  }
}

export default function SideMenu({ open, setOpen, title, children }: Props) {
  const { t } = useTranslation();
  // getVersion is a synchronous IPC round trip and the version can't change
  // while the app runs, so read it once per mount rather than every render.
  const [version] = useState(readAppVersion);
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-overlay/60 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-400"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-400"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-surface pb-6 text-fg shadow-xl">
                    {/* The header stays put while the settings scroll, so
                        the close button is always one tap away. */}
                    <div className="sticky top-0 z-10 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface py-1 pl-4 pr-2 sm:pl-6">
                      <Dialog.Title className="text-lg font-semibold leading-7 text-fg">
                        {title}
                      </Dialog.Title>
                      <IconButton
                        label={t('common:closePanel')}
                        icon={
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        }
                        onClick={() => setOpen(false)}
                      />
                    </div>
                    <div className="relative mt-4 flex-1 px-2">
                      <div className="px-4">{children}</div>
                    </div>
                    {/* The only "Support PlayOverlay" link in the app sits
                        down here, under the settings and well away from the
                        live controls: it opens a browser, which is never
                        something an operator should hit by accident during
                        a match. */}
                    <div className="mt-6 flex flex-col items-center gap-2 px-6">
                      <button
                        type="button"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        onClick={() =>
                          window?.electronAPI?.openUrlInBrowser(SUPPORT_URL)
                        }
                      >
                        <HeartIcon className="h-5 w-5" aria-hidden="true" />
                        {t('common:support')}
                      </button>
                      {version && (
                        <p className="text-center text-xs text-faint">
                          {t('common:versionLabel', { version })}
                        </p>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
