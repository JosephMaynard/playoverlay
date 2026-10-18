import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@playoverlay/core';

// The one button recipe for the dashboard. Sizes are hit targets, not
// looks: md is the 48px floor for anything an operator might tap on a
// tablet, lg and xl are for the handful of controls used during play
// (goal, start, stop, screen switches), which have to land with a thumb
// while the other hand is on a camera.
export type ActionButtonVariant =
  'secondary' | 'primary' | 'live' | 'danger' | 'danger-ghost' | 'ghost';
export type ActionButtonSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
  xl: 'min-h-16 px-6 text-xl',
};

const variantClasses: Record<ActionButtonVariant, string> = {
  secondary:
    'bg-surface text-fg ring-1 ring-inset ring-line hover:bg-surface-2 hover:ring-line-strong',
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  live: 'bg-live text-live-fg hover:bg-live-hover',
  danger: 'bg-danger text-danger-fg hover:bg-danger-hover',
  // A quiet destructive action (reset, delete from a list): red text and
  // outline only, so it never competes with the live controls beside it.
  'danger-ghost':
    'text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger-soft hover:text-danger-ink',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
};

// A selected segmented-control button (the screen on air, the phase that is
// running) uses the live green so it reads the same as the preview badge.
const selectedClasses =
  'bg-live-soft text-live-ink ring-2 ring-inset ring-live hover:bg-live-soft';

export interface ActionButtonStyle {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  selected?: boolean;
  block?: boolean;
}

export function actionButtonClasses({
  variant = 'secondary',
  size = 'md',
  selected = false,
  block = false,
}: ActionButtonStyle = {}): string {
  return classNames(
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold leading-tight transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface',
    sizeClasses[size],
    selected ? selectedClasses : variantClasses[variant],
    block ? 'w-full' : ''
  );
}

export interface Props
  extends
    ActionButtonStyle,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  icon?: ReactNode;
  children?: ReactNode;
}

export default function ActionButton({
  variant,
  size,
  selected,
  block,
  icon,
  className,
  children,
  ...buttonProps
}: Props) {
  return (
    <button
      type="button"
      className={classNames(
        actionButtonClasses({ variant, size, selected, block }),
        className ?? ''
      )}
      // Only a genuine toggle passes `selected`; plain actions leave it
      // undefined so no false "not pressed" state is announced.
      aria-pressed={selected === undefined ? undefined : selected}
      {...buttonProps}
    >
      {icon}
      {children}
    </button>
  );
}
