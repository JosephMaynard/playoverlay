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

const menuButtons = [
  {
    title: 'Team Settings',
    icon: UserGroupIcon,
    menu: 'team-settings',
  },
  {
    title: 'Custom Screens',
    icon: PhotoIcon,
    menu: 'custom-screens',
  },
  {
    title: 'Window Settings',
    icon: ComputerDesktopIcon,
    menu: 'app-settings',
  },
  {
    title: 'System Settings',
    icon: Cog6ToothIcon,
    menu: 'system-settings',
  },
];

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
        <ul className="flex items-center gap-x-4">
          {menuButtons.map((menuButton) => (
            <li key={menuButton.menu}>
              <button
                type="button"
                className="ml-auto p-2.5"
                onMouseDown={() => setSideMenu(menuButton.menu as SideMenuType)}
                title={menuButton.title}
              >
                <menuButton.icon
                  className="h-6 w-6  text-gray-400 hover:text-indigo-500"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
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
            {menuButtons.map((menuButton, index) => (
              <li
                key={menuButton.menu}
                className={index === 0 ? 'mt-auto' : undefined}
              >
                <button
                  type="button"
                  className="-m-2.5 p-2.5"
                  onMouseDown={() =>
                    setSideMenu(menuButton.menu as SideMenuType)
                  }
                  title={menuButton.title}
                >
                  <menuButton.icon
                    className="h-8 w-8 text-gray-400 hover:text-indigo-500"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
