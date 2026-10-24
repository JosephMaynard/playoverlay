import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@playoverlay/core';

// The one button recipe for the dashboard. Sizes are hit targets, not
// looks: md is the 48px floor for anything an operator might tap on a
// tablet, lg and xl are for the handful of controls used during play
// (goal, start, stop, screen switches), which have to land with a thumb
// while the other hand is on a camera.
//
// The filled variants are drawn as keys (see .key in index.css): a short
// gradient, a hairline and an inset highlight, so the dashboard reads like
// the control surface of a vision mixer rather than a web form.
export type ActionButtonVariant =
  'secondary' | 'primary' | 'live' | 'danger' | 'danger-ghost' | 'ghost';
export type ActionButtonSize = 'sm' | 'md' | 'lg' | 'xl';
// What a selected key means: on air (red), running (green) or simply the
// chosen option (accent). The colour carries the meaning, so a screen on
// air and a phase that is running can never be confused.
export type ActionButtonSelectedTone = 'air' | 'go' | 'accent';

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
  xl: 'min-h-16 px-6 text-xl',
};

const variantClasses: Record<ActionButtonVariant, string> = {
  secondary: 'key text-fg',
  primary: 'key key-accent',
  live: 'key key-go',
  danger: 'key key-air',
  // A quiet destructive action (reset, delete from a list): red text and
  // outline only, so it never competes with the live controls beside it.
  'danger-ghost':
    'text-danger ring-1 ring-inset ring-danger/40 hover:bg-danger-soft hover:text-danger-ink',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
};

const selectedClasses: Record<ActionButtonSelectedTone, string> = {
  air: 'key key-air key-lit',
  go: 'key key-go key-lit',
  accent: 'key key-accent key-lit',
};

export interface ActionButtonStyle {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  selected?: boolean;
  selectedTone?: ActionButtonSelectedTone;
  block?: boolean;
}

export function actionButtonClasses({
  variant = 'secondary',
  size = 'md',
  selected = false,
  selectedTone = 'accent',
  block = false,
}: ActionButtonStyle = {}): string {
  return classNames(
    'inline-flex select-none items-center justify-center gap-2 rounded font-semibold leading-tight transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:cursor-not-allowed disabled:opacity-40',
    sizeClasses[size],
    selected ? selectedClasses[selectedTone] : variantClasses[variant],
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
  selectedTone,
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
        actionButtonClasses({ variant, size, selected, selectedTone, block }),
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
