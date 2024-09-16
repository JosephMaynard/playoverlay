import {
  Cog6ToothIcon,
  ComputerDesktopIcon,
  PhotoIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

// @ts-ignore
import logo from '../../assets/playoverlay-logo.svg';
import { SideMenuType } from './Dashboard';

export interface Props {
  setSideMenu: (sideMenu: SideMenuType) => void;
}

export default function DashboardHeader({ setSideMenu }: Props) {
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <div className="flex  items-center gap-x-4">
          <img className="h-7 w-auto" src={logo} alt="PlayOverlay logo" />
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
            PlayOverlay
          </div>
        </div>
        <button
          type="button"
          className="-m-2.5 ml-auto mr-4 p-2.5 text-gray-700"
          onClick={() => setSideMenu('team-settings')}
          title="Team Settings"
        >
          <span className="sr-only">Open Team Settings</span>
          <UserGroupIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="-m-2.5 mr-4 p-2.5 text-gray-700"
          onClick={() => setSideMenu('custom-screens')}
          title="Custom Screens"
        >
          <span className="sr-only">Open Custom Screens</span>
          <PhotoIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="-m-2.5 mr-4 p-2.5 text-gray-700"
          onClick={() => setSideMenu('app-settings')}
          title="Window Settings"
        >
          <span className="sr-only">Open Window Settings</span>
          <ComputerDesktopIcon className="h-6 w-6" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700"
          onClick={() => setSideMenu('system-settings')}
          title="System Settings"
        >
          <span className="sr-only">Open Window Settings</span>
          <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
      <div className="hidden shadow lg:fixed lg:inset-y-0 lg:right-0 lg:z-50 lg:flex lg:w-20 lg:flex-col lg:overflow-y-auto lg:bg-white lg:pb-4">
        <div className="flex h-16 shrink-0 items-center justify-center">
          <img className="h-8 w-auto" src={logo} alt="PlayOverlay logo" />
        </div>
        <nav className="mt-8 flex grow flex-col">
          <ul
            role="list"
            className="flex h-full flex-1 flex-col items-center gap-6 pb-2"
          >
            <li className="mt-auto">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setSideMenu('team-settings')}
                title="Team Settings"
              >
                <span className="sr-only">Open Team Settings</span>
                <UserGroupIcon
                  className="h-8 w-8 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setSideMenu('custom-screens')}
                title="Custom Screens"
              >
                <span className="sr-only">Open Custom Screens</span>
                <PhotoIcon
                  className="h-8 w-8 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setSideMenu('app-settings')}
                title="Window Settings"
              >
                <span className="sr-only">Open Window Settings</span>
                <ComputerDesktopIcon
                  className="h-8 w-8 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </li>
            <li>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setSideMenu('system-settings')}
                title="Window Settings"
              >
                <span className="sr-only">Open System Settings</span>
                <Cog6ToothIcon
                  className="h-8 w-8 text-gray-500"
                  aria-hidden="true"
                />
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
