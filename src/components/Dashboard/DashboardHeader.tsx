import {
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  Cog6ToothIcon,
  ComputerDesktopIcon,
  DocumentPlusIcon,
  HeartIcon,
  PhotoIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { ComponentType, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

import logo from '../../assets/playoverlay-logo.svg';
import {
  SUPPORT_URL,
  SideMenuType,
  selectCanRedo,
  selectCanUndo,
  selectNextRedoLabel,
  selectNextUndoLabel,
  useUndoStore,
} from '@playoverlay/core';
import IconButton from '../ui/IconButton';

export interface Props {
  setSideMenu: (sideMenu: SideMenuType) => void;
  // Opens the New match confirmation (the reset itself lives in Dashboard).
  onNewMatch: () => void;
}

// Titles are i18n keys rather than literal strings: three of the four reuse
// the exact same text as the settings menu each button opens (settings.json
// customScreens/appMenu/system titles), so they're resolved through t() at
// render time rather than duplicated here. The caption is a one-word label
// under the rail icon, so a new operator does not have to hover to learn
// what each one opens.
const menuButtons = [
  {
    titleKey: 'dashboard:header.teamSettings',
    captionKey: 'dashboard:header.teams',
    icon: UserGroupIcon,
    menu: 'team-settings',
  },
  {
    titleKey: 'settings:customScreens.title',
    captionKey: 'dashboard:header.graphics',
    icon: PhotoIcon,
    menu: 'custom-screens',
  },
  {
    titleKey: 'settings:appMenu.title',
    captionKey: 'dashboard:header.window',
    icon: ComputerDesktopIcon,
    menu: 'app-settings',
  },
  {
    titleKey: 'settings:system.title',
    captionKey: 'dashboard:header.settings',
    icon: Cog6ToothIcon,
    menu: 'system-settings',
  },
];

interface MatchAction {
  key: 'newMatch' | 'undo' | 'redo';
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  caption: string;
  disabled: boolean;
  onClick: () => void;
}

const iconClassName = 'h-7 w-7';

export default function DashboardHeader({ setSideMenu, onNewMatch }: Props) {
  const { t } = useTranslation();

  const canUndo = useUndoStore(selectCanUndo);
  const canRedo = useUndoStore(selectCanRedo);
  const nextUndoKey = useUndoStore(selectNextUndoLabel);
  const nextRedoKey = useUndoStore(selectNextRedoLabel);
  const undo = useUndoStore((state) => state.undo);
  const redo = useUndoStore((state) => state.redo);

  // The next-action label keys resolve to a short action phrase ("home goal"),
  // interpolated into the button copy. Empty stacks fall back to the
  // "nothing to undo/redo" strings. Genuinely disabled (not just greyed)
  // when the stack is empty.
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
      key: 'newMatch',
      icon: DocumentPlusIcon,
      label: t('dashboard:newMatch.button'),
      caption: t('dashboard:header.newMatch'),
      disabled: false,
      onClick: onNewMatch,
    },
    {
      key: 'undo',
      icon: ArrowUturnLeftIcon,
      label: undoLabel,
      caption: t('dashboard:header.undo'),
      disabled: !canUndo,
      onClick: undo,
    },
    {
      key: 'redo',
      icon: ArrowUturnRightIcon,
      label: redoLabel,
      caption: t('dashboard:header.redo'),
      disabled: !canRedo,
      onClick: redo,
    },
  ];

  const supportLabel = t('common:support');
  const openSupport = () => window?.electronAPI?.openUrlInBrowser(SUPPORT_URL);

  return (
    <>
      {/* Narrow windows: a sticky top bar with the same controls, no
          captions. */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 lg:hidden">
        <div className="flex min-w-0 items-center gap-x-3">
          <img className="h-7 w-auto" src={logo} alt={t('common:logoAlt')} />
          <div className="truncate text-sm font-semibold leading-6 text-fg">
            PlayOverlay
          </div>
        </div>
        <ul className="flex items-center gap-x-1">
          {matchActions.map((action) => (
            <li key={action.key}>
              <IconButton
                label={action.label}
                icon={<action.icon className="h-6 w-6" aria-hidden="true" />}
                onClick={action.onClick}
                disabled={action.disabled}
              />
            </li>
          ))}
          <li aria-hidden="true">
            <span className="mx-1 block h-6 w-px bg-line" />
          </li>
          {menuButtons.map((menuButton) => (
            <li key={menuButton.menu}>
              <IconButton
                label={t('dashboard:header.openMenu', {
                  title: t(menuButton.titleKey),
                })}
                icon={
                  <menuButton.icon className="h-6 w-6" aria-hidden="true" />
                }
                onClick={() => setSideMenu(menuButton.menu as SideMenuType)}
              />
            </li>
          ))}
          <li aria-hidden="true">
            <span className="mx-1 block h-6 w-px bg-line" />
          </li>
          <li>
            <IconButton
              label={supportLabel}
              tone="support"
              icon={<HeartIcon className="h-6 w-6" aria-hidden="true" />}
              onClick={openSupport}
            />
          </li>
        </ul>
      </div>

      {/* Wide windows: a fixed rail down the right edge. Match actions sit
          at the top where the thumb rests on a tablet held in landscape;
          settings cluster at the bottom, away from the live controls. */}
      <div className="hidden border-l border-line bg-surface lg:fixed lg:inset-y-0 lg:right-0 lg:z-50 lg:flex lg:w-24 lg:flex-col lg:items-center lg:overflow-y-auto lg:py-3">
        <img className="h-9 w-auto" src={logo} alt={t('common:logoAlt')} />
        <nav className="mt-4 flex grow flex-col items-center">
          <ul role="list" className="flex flex-col items-center gap-1">
            {matchActions.map((action) => (
              <li key={action.key}>
                <IconButton
                  size="lg"
                  label={action.label}
                  caption={action.caption}
                  icon={
                    <action.icon className={iconClassName} aria-hidden="true" />
                  }
                  onClick={action.onClick}
                  disabled={action.disabled}
                />
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col items-center gap-1">
            <ul role="list" className="flex flex-col items-center gap-1">
              {menuButtons.map((menuButton) => (
                <li key={menuButton.menu}>
                  <IconButton
                    size="lg"
                    label={t(menuButton.titleKey)}
                    caption={t(menuButton.captionKey)}
                    icon={
                      <menuButton.icon
                        className={iconClassName}
                        aria-hidden="true"
                      />
                    }
                    onClick={() => setSideMenu(menuButton.menu as SideMenuType)}
                  />
                </li>
              ))}
            </ul>
            <span className="my-1 h-px w-10 bg-line" aria-hidden="true" />
            {/* The one "Support PlayOverlay" link in the app: a heart that
                opens the Ko-fi page in the system browser, at the same
                weight as the settings icons so it never shouts. */}
            <IconButton
              size="lg"
              label={supportLabel}
              tone="support"
              icon={<HeartIcon className={iconClassName} aria-hidden="true" />}
              onClick={openSupport}
            />
          </div>
        </nav>
      </div>
    </>
  );
}
