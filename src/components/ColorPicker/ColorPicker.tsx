import { useState } from 'react';
import { checkColors } from '../../utils';

export interface Props {
  value?: string;
  label: string;
  onChange: (value: string) => void;
  keyColour?: string;
}

export default function ColourPicker({
  value,
  label,
  onChange,
  keyColour,
}: Props) {
  const [id] = useState(`${label}-${Math.random().toString()}`);
  return (
    <div className="col-span-full">
      <div className="relative flex items-start justify-between">
        <label
          htmlFor={id}
          className="block text-sm font-medium leading-6 text-gray-900"
        >
          {label}
        </label>
        <input
          type="color"
          name="street-address"
          id={id}
          onChange={(e) => onChange(e.target.value)}
          value={value}
          className="h-6 w-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
        />
      </div>
      {keyColour && checkColors(value, keyColour) && (
        <p className="text-sm font-medium text-red-600 ">
          Warning: This colour may be too close to the key colour, please check
          your output.
        </p>
      )}
    </div>
  );
}
