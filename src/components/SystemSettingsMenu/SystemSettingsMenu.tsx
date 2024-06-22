import { useState } from 'react';
import { LockOpenIcon } from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';
import { classNames } from '../../utils';
import ManualActivationModal from './ManualActivationModal';

export interface Props {
  open: boolean;
  setOpen: () => void;
}

export default function SystemSettingsMenu({ open, setOpen }: Props) {
  const [currentModal, setCurrentModal] = useState<null | 'activation'>(null);
  return (
    <>
      <SideMenu open={open} setOpen={setOpen} title="System Settings">
        <ul role="list" className="-mx-2 space-y-1">
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={() => {
                setCurrentModal('activation');
                setOpen();
              }}
            >
              <LockOpenIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              Manual Activation
            </button>
          </li>
        </ul>
      </SideMenu>
      <ManualActivationModal
        open={currentModal === 'activation'}
        setOpen={(open: boolean) => setCurrentModal(null)}
      />
    </>
  );
}
