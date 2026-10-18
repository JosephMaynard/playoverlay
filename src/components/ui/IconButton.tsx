import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@playoverlay/core';

export interface Props extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'children'
> {
  // Icon-only controls must always have an accessible name; title is set to
  // the same text so a mouse user gets the tooltip.
  label: string;
  icon: ReactNode;
  // A visible caption under the icon, for the settings rail where a bare
  // icon is a guess for a new operator.
  caption?: string;
  size?: 'md' | 'lg';
  tone?: 'default' | 'danger';
}

const sizeClasses = {
  md: 'min-h-12 min-w-12',
  lg: 'min-h-14 min-w-14',
};

const toneClasses = {
  default: 'text-muted hover:bg-surface-2 hover:text-fg',
  danger: 'text-muted hover:bg-danger-soft hover:text-danger-ink',
};

// A 48px-or-larger icon target. The negative-margin trick the old rail used
// kept the icon small while extending the hit area invisibly; here the
// whole target is visible on hover, so an operator can see what they can
// press.
export default function IconButton({
  label,
  icon,
  caption,
  size = 'md',
  tone = 'default',
  className,
  ...buttonProps
}: Props) {
  return (
    <button
      type="button"
      className={classNames(
        'inline-flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted',
        sizeClasses[size],
        toneClasses[tone],
        className ?? ''
      )}
      title={label}
      aria-label={label}
      {...buttonProps}
    >
      {icon}
      {caption && (
        <span
          aria-hidden="true"
          className="text-[11px] font-medium leading-none"
        >
          {caption}
        </span>
      )}
    </button>
  );
}
