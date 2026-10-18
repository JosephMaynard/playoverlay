import { Switch } from '@headlessui/react';
import { classNames } from '@playoverlay/core';

export interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  // Secondary line under the label, for toggles whose effect needs a
  // sentence (auto-start at half-time, goal banner).
  description?: string;
  disabled?: boolean;
  className?: string;
}

// One toggle for the whole dashboard, replacing seven copies of the same
// Headless UI Switch markup. The track is 56 by 32 so it is a thumb target
// in its own right, and the whole row (label included) toggles it.
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: Props) {
  return (
    <Switch.Group
      as="div"
      className={classNames('flex items-start gap-3', className ?? '')}
    >
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={classNames(
          checked ? 'bg-accent' : 'bg-line-strong',
          'relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:cursor-not-allowed disabled:opacity-40'
        )}
      >
        <span
          aria-hidden="true"
          className={classNames(
            checked ? 'translate-x-6' : 'translate-x-0',
            'pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out'
          )}
        />
      </Switch>
      <Switch.Label as="span" className="min-h-8 cursor-pointer select-none">
        <span className="block text-base font-medium leading-8 text-fg">
          {label}
        </span>
        {description && (
          <span className="block text-sm leading-snug text-muted">
            {description}
          </span>
        )}
      </Switch.Label>
    </Switch.Group>
  );
}
