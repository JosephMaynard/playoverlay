import { useEffect, useState } from 'react';
import {
  CalculatorIcon,
  InformationCircleIcon,
  LockOpenIcon,
  ShoppingCartIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import SideMenu from '../SideMenu/SideMenu';
import { classNames } from '../../utils';
import ManualActivationModal from './ManualActivationModal';
import Modal from '../Modal/Modal';
import { LicenceKeyData, MatchSettings } from '../../zodSchemas';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import { connectToStreamDeck } from '../../stream-deck';

export interface Props {
  open: boolean;
  isDemoMode: boolean;
  matchSettings: MatchSettings;
  setOpen: () => void;
  incrementHomeTeamScore: () => void;
  incrementAwayTeamScore: () => void;
  nextMatchPhase: () => void;
}

export type Modals = null | 'about' | 'activation' | 'delete-licence-key';

export default function SystemSettingsMenu({
  open,
  setOpen,
  isDemoMode,
  matchSettings,
  incrementHomeTeamScore,
  incrementAwayTeamScore,
  nextMatchPhase,
}: Props) {
  const [currentModal, setCurrentModal] = useState<Modals>(null);
  const [loading, setLoading] = useState(false);
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
  }, [loading]);
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
          <li>
            <button
              className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
              onClick={() => {
                connectToStreamDeck([
                  {
                    text: 'Next Match Phase',
                    textColor: 'white',
                    backgroundColor: 'red',
                    onPress: nextMatchPhase,
                  },
                  {
                    text: `${matchSettings.homeTeamNameFull} Scored`,
                    textColor: matchSettings.homeTeamTextColour,
                    backgroundColor: matchSettings.homeTeamBackgroundColour,
                    onPress: incrementHomeTeamScore,
                  },
                  {
                    text: `${matchSettings.awayTeamNameFull} Scored`,
                    textColor: matchSettings.awayTeamTextColour,
                    backgroundColor: matchSettings.awayTeamBackgroundColour,
                    onPress: incrementAwayTeamScore,
                  },
                ]);
              }}
            >
              <CalculatorIcon
                className={classNames(
                  'text-gray-400 group-hover:text-indigo-600',
                  'h-6 w-6 shrink-0'
                )}
                aria-hidden="true"
              />
              Connect to Stream Deck
            </button>
          </li>
          {isDemoMode ? (
            <>
              <li>
                <button
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                  onClick={() => {
                    window.electronAPI.openUrlInBrowser(
                      'https://account.playoverlay.com'
                    );
                    setOpen();
                  }}
                >
                  <ShoppingCartIcon
                    className={classNames(
                      'text-gray-400 group-hover:text-indigo-600',
                      'h-6 w-6 shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  Buy now
                </button>
              </li>
              <li>
                <button
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
                  onClick={() => {
                    window.electronAPI.openActivationLink();
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
                  Activate Purchase
                </button>
              </li>
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
        action={
          navigator.onLine
            ? () => {
                setLoading(true);
                window?.electronAPI
                  ?.renewLicenceKey()
                  .then(() => {
                    setLoading(false);
                  })
                  .catch(() => {
                    setLoading(false);
                  });
              }
            : undefined
        }
      >
        {isDemoMode && <p className="mb-4 text-sm text-gray-500">Demo mode</p>}
        {loading && (
          <div className="mx-4 h-60 w-80">
            <LoadingSpinner />
          </div>
        )}
        {!isDemoMode && !loading && (
          <div className="mt-6 border-t border-gray-100">
            <dl className="divide-y divide-gray-100">
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-900">
                  Product
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {licenceData?.description}
                </dd>
              </div>
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-900">
                  Version
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {window?.electronAPI?.getVersion()}
                </dd>
              </div>
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-900">
                  Licenced to
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {licenceData?.email}
                </dd>
              </div>
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-900">
                  Current licence valid from
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {new Date(licenceData?.iat * 1000).toLocaleString()}
                </dd>
              </div>
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-gray-900">
                  Current licence expires
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                  {Math.floor(
                    (licenceData?.exp - Math.floor(Date.now() / 1000)) /
                      (60 * 60 * 24)
                  )}{' '}
                  days at: {new Date(licenceData?.exp * 1000).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </>
  );
}
