import { Fragment, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import ColourPicker from '../ColorPicker/ColorPicker';
import { AppSettings, TeamSettingsInterface } from 'src/types';
import TeamSettings from './TeamSettings';
import CollapsiblePanel from '../CollapsiblePanel/CollapsiblePanel';

export interface Props {
  sidebarOpen: boolean;
  setSidebarOpen: (sidebarOpen: boolean) => void;
  teamSettings: TeamSettingsInterface;
  updateTeamSettings: (updatedSettings: Partial<TeamSettingsInterface>) => void;
  appSettings: AppSettings;
  updateAppSettings: (updatedSettings: Partial<AppSettings>) => void;
}

export default function SettingsMenu({
  sidebarOpen,
  setSidebarOpen,
  teamSettings,
  updateTeamSettings,
  appSettings,
  updateAppSettings,
}: Props) {
  return (
    <Transition.Root show={sidebarOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={setSidebarOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300 sm:duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300 sm:duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                    <div className="px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                          Settings
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="relative rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            onClick={() => setSidebarOpen(false)}
                          >
                            <span className="absolute -inset-2.5" />
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-4 flex-1 px-2">
                      <div className="px-4">
                        <CollapsiblePanel title="System">
                          <ColourPicker
                            label="Key Colour"
                            onChange={(keyColour: string) => {
                              updateAppSettings({ keyColour });
                            }}
                            value={appSettings.keyColour}
                          />
                        </CollapsiblePanel>

                        <TeamSettings
                          title="Home Team"
                          teamNameFull={teamSettings.homeTeamNameFull}
                          setTeamNameFull={(homeTeamNameFull: string) =>
                            updateTeamSettings({ homeTeamNameFull })
                          }
                          teamNameAbbreviated={
                            teamSettings.homeTeamNameAbbreviated
                          }
                          setTeamNameAbbreviated={(
                            homeTeamNameAbbreviated: string
                          ) => updateTeamSettings({ homeTeamNameAbbreviated })}
                          textColour={teamSettings.homeTeamTextColour}
                          setTextColour={(homeTeamTextColour: string) =>
                            updateTeamSettings({ homeTeamTextColour })
                          }
                          backgroundColour={
                            teamSettings.homeTeamBackgroundColour
                          }
                          setBackgroundColour={(
                            homeTeamBackgroundColour: string
                          ) => updateTeamSettings({ homeTeamBackgroundColour })}
                        />
                        <TeamSettings
                          title="Away Team"
                          teamNameFull={teamSettings.awayTeamNameFull}
                          setTeamNameFull={(awayTeamNameFull: string) =>
                            updateTeamSettings({ awayTeamNameFull })
                          }
                          teamNameAbbreviated={
                            teamSettings.awayTeamNameAbbreviated
                          }
                          setTeamNameAbbreviated={(
                            awayTeamNameAbbreviated: string
                          ) => updateTeamSettings({ awayTeamNameAbbreviated })}
                          textColour={teamSettings.awayTeamTextColour}
                          setTextColour={(awayTeamTextColour: string) =>
                            updateTeamSettings({ awayTeamTextColour })
                          }
                          backgroundColour={
                            teamSettings.awayTeamBackgroundColour
                          }
                          setBackgroundColour={(
                            awayTeamBackgroundColour: string
                          ) => updateTeamSettings({ awayTeamBackgroundColour })}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-center text-xs">
                        Version: {window?.electronAPI?.getVersion() || '1.0.0'}
                      </p>
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
