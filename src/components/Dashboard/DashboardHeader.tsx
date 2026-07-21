import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  PhotoIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '../../assets/playoverlay-logo.svg';
import { SideMenuType } from '../../types';
import {
  selectCanRedo,
  selectCanUndo,
  selectNextRedoLabel,
  selectNextUndoLabel,
  useUndoStore,
} from '../../store/undo';

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

interface MatchAction {
  key: 'undo' | 'redo';
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  disabled: boolean;
  onClick: () => void;
}

// An icon-only match-action button (undo/redo). Genuinely disabled (not just
// greyed) when its stack is empty, and carries an accessible name/title that
// names the specific action it will reverse ("Undo home goal") or "Nothing to
// undo" when the stack is empty. Shared by the mobile top bar and the desktop
// right rail so both stay in lockstep.
function MatchActionButton({
  action,
  iconClassName,
}: {
  action: MatchAction;
  iconClassName: string;
}) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      className="-m-2.5 p-2.5 disabled:cursor-not-allowed"
      onClick={action.onClick}
      disabled={action.disabled}
      title={action.label}
      aria-label={action.label}
    >
      <Icon
        className={`${iconClassName} ${
          action.disabled
            ? 'text-gray-300'
            : 'text-gray-400 hover:text-indigo-500'
        }`}
        aria-hidden={true}
      />
    </button>
  );
}

export default function DashboardHeader({ setSideMenu }: Props) {
  const { t } = useTranslation();

  const canUndo = useUndoStore(selectCanUndo);
  const canRedo = useUndoStore(selectCanRedo);
  const nextUndoKey = useUndoStore(selectNextUndoLabel);
  const nextRedoKey = useUndoStore(selectNextRedoLabel);
  const undo = useUndoStore((state) => state.undo);
  const redo = useUndoStore((state) => state.redo);

  // The next-action label keys resolve to a short action phrase ("home goal"),
  // interpolated into the button copy. Empty stacks fall back to the
  // "nothing to undo/redo" strings.
  const undoLabel =
    canUndo && nextUndoKey
      ? t('undo:button.undo', { action: t(nextUndoKey) })
      : t('undo:button.nothingToUndo');
  const redoLabel =
    canRedo && nextRedoKey
      ? t('undo:button.redo', { action: t(nextRedoKey) })
      : t('undo:button.nothingToRedo');

  const matchActions: MatchAction[] = [
    {
      key: 'undo',
      icon: ArrowUturnLeftIcon,
      label: undoLabel,
      disabled: !canUndo,
      onClick: undo,
    },
    {
      key: 'redo',
      icon: ArrowUturnRightIcon,
      label: redoLabel,
      disabled: !canRedo,
      onClick: redo,
    },
  ];

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <div className="flex items-center gap-x-4">
          <img className="h-7 w-auto" src={logo} alt={t('common:logoAlt')} />
          <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
            PlayOverlay
          </div>
        </div>
        <ul className="flex items-center gap-x-4">
          {/* Match actions (undo/redo) are global controls, kept apart from the
              settings-navigation icons by a divider. */}
          {matchActions.map((action) => (
            <li key={action.key}>
              <MatchActionButton action={action} iconClassName="h-6 w-6" />
            </li>
          ))}
          <li aria-hidden="true">
            <span className="block h-6 w-px bg-gray-200" />
          </li>
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
          <img className="h-8 w-auto" src={logo} alt={t('common:logoAlt')} />
        </div>
        <nav className="mt-8 flex grow flex-col">
          {/* Match actions and settings navigation cluster at the bottom of the
              rail, separated by a horizontal divider. */}
          <div className="mt-auto flex flex-col items-center gap-6 pb-2">
            <ul role="list" className="flex flex-col items-center gap-6">
              {matchActions.map((action) => (
                <li key={action.key}>
                  <MatchActionButton action={action} iconClassName="h-8 w-8" />
                </li>
              ))}
            </ul>
            <span
              className="h-px w-8 bg-gray-200"
              aria-hidden="true"
              role="presentation"
            />
            <ul role="list" className="flex flex-col items-center gap-6">
              {menuButtons.map((menuButton) => (
                <li key={menuButton.menu}>
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
          </div>
        </nav>
      </div>
    </>
  );
}
