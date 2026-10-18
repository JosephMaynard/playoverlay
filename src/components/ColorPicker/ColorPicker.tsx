import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkColors, classNames } from '@playoverlay/core';
import { errorTextClassName, labelClassName } from '../ui/fields';

export interface Props {
  value?: string;
  label: string;
  onChange: (value: string) => void;
  keyColour?: string;
  disabled?: boolean;
}

export default function ColourPicker({
  value,
  label,
  onChange,
  keyColour,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const [id] = useState(`${label}-${Math.random().toString()}`);
  return (
    <div className="col-span-full">
      {/* The whole row is the label, so tapping the name opens the picker
          too. The native input is stretched invisibly over a 48px swatch
          because its own chrome is a tiny, unthemeable box. */}
      <label
        htmlFor={id}
        className={classNames(
          'flex min-h-12 items-center justify-between gap-3',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        )}
      >
        <span className={labelClassName}>{label}</span>
        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-surface ring-1 ring-inset ring-line focus-within:ring-2 focus-within:ring-accent hover:ring-line-strong">
          <span
            aria-hidden="true"
            className="h-8 w-8 rounded-lg ring-1 ring-black/10"
            style={{ backgroundColor: value }}
          />
          <input
            type="color"
            name="street-address"
            id={id}
            onChange={(e) => onChange(e.target.value)}
            value={value}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            disabled={disabled}
          />
        </span>
      </label>
      {keyColour && value && checkColors(value, keyColour) && (
        <p className={errorTextClassName}>
          {t('settings:colourPicker.keyColourWarning')}
        </p>
      )}
    </div>
  );
}
