import {
  Cog6ToothIcon,
  ComputerDesktopIcon,
  PhotoIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import logo from '../../assets/playoverlay-logo.svg';
import { SideMenuType } from '../../types';

export interface Props {
  setSideMenu: (sideMenu: SideMenuType) => void;
}

// Titles are i18n keys rather than literal strings: three of the four reuse
// the exact same text as the settings menu each button opens (settings.json
// customScreens/appMenu/system titles), so they're resolved through t() at
// render time rather than duplicated here.
const menuButtons = [
  {
    titleKey: 'dashboard:header.teamSettings',
    icon: UserGroupIcon,
    menu: 'team-settings',
  },
  {
    titleKey: 'settings:customScreens.title',
    icon: PhotoIcon,
    menu: 'custom-screens',
  },
  {
    titleKey: 'settings:appMenu.title',
    icon: ComputerDesktopIcon,
    menu: 'app-settings',
  },
  {
    titleKey: 'settings:system.title',
    icon: Cog6ToothIcon,
    menu: 'system-settings',
  },
];

export default function DashboardHeader({ setSideMenu }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <div className="flex items-center gap-x-4">
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
                onClick={() => setSideMenu(menuButton.menu as SideMenuType)}
                title={t(menuButton.titleKey)}
              >
                <menuButton.icon
                  className="h-6 w-6 text-gray-400 hover:text-indigo-500"
                  aria-hidden="true"
                />
                <span className="sr-only">
                  {t('dashboard:header.openMenu', {
                    title: t(menuButton.titleKey),
                  })}
                </span>
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
                  onClick={() => setSideMenu(menuButton.menu as SideMenuType)}
                  title={t(menuButton.titleKey)}
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
