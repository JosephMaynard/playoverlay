import { useEffect, useState } from 'react';
import {
  InformationCircleIcon,
  LockOpenIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';
import { classNames } from '../../utils';
import ManualActivationModal from './ManualActivationModal';
import Modal from '../Modal/Modal';
import { LicenceKeyData } from 'src/main-functions/validateJWT';

export interface Props {
  open: boolean;
  setOpen: () => void;
  isDemoMode: boolean;
}

export type Modals = null | 'about' | 'activation' | 'delete-licence-key';

export default function SystemSettingsMenu({
  open,
  setOpen,
  isDemoMode,
}: Props) {
  const [currentModal, setCurrentModal] = useState<Modals>(null);

  const [licenceData, setlicenceData] = useState<LicenceKeyData>();

  useEffect(() => {
    window?.electronAPI
      ?.getLicencedData()
      .then((retrivedLicenceData) => {
        if (retrivedLicenceData) {
          setlicenceData(retrivedLicenceData);
        }
      })
      .catch((error: any) => {
        console.error('Failed to load fetch licence data:', error);
      });
  }, []);
  return (
    <>
      <SideMenu open={open} setOpen={setOpen} title="System Settings">
        <ul role="list" className="-mx-2 space-y-1">
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={() => {
                setCurrentModal('about');
                setOpen();
              }}
            >
              <InformationCircleIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              About
            </button>
          </li>
          {isDemoMode ? (
            <>
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
            </>
          ) : (
            <>
              <li>
                <button
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                  onClick={() => {
                    setCurrentModal('delete-licence-key');
                    setOpen();
                  }}
                >
                  <TrashIcon
                    className={classNames(
                      'text-gray-400 group-hover:text-indigo-600',
                      'h-6 w-6 shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  Delete licence key
                </button>
              </li>
            </>
          )}
        </ul>
      </SideMenu>
      <ManualActivationModal
        open={currentModal === 'activation'}
        setOpen={() => setCurrentModal(null)}
      />
      <Modal
        open={currentModal === 'delete-licence-key'}
        setOpen={() => setCurrentModal(null)}
        title="Delete licence key?"
        actionButtonLabel="Delete"
        icon="warning"
        action={() => {
          window?.electronAPI?.deleteLicenceKey();
        }}
      >
        <p className="text-sm text-gray-500">
          Are you sure you want to delete the licence key? App will only run in
          Demo Mode until reauthorised.
        </p>
      </Modal>
      <Modal
        open={currentModal === 'about'}
        setOpen={() => setCurrentModal(null)}
        title="About PlayOverlay"
        actionButtonLabel="Renew licence now"
        icon="playoverlay-logo"
        action={navigator.onLine ? () => alert('bing') : undefined}
      >
        {isDemoMode ? (
          <p className="mb-4 text-sm text-gray-500">Demo mode</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {licenceData?.description}
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Licenced to: {licenceData?.email}
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Current licence valid from:{' '}
              {new Date(licenceData?.iat * 1000).toLocaleString()}
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Current licence expires in{' '}
              {Math.floor(
                (licenceData?.exp - Math.floor(Date.now() / 1000)) /
                  (60 * 60 * 24)
              )}{' '}
              days at: {new Date(licenceData?.exp * 1000).toLocaleString()}
            </p>
          </>
        )}
      </Modal>
    </>
  );
}
