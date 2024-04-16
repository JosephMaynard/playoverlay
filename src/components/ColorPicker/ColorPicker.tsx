import { useState } from "react";

export interface Props {
  value?: string;
  label: string;
  onChange: (value: string) => void;
}

export default function ColourPicker({ value, label, onChange }: Props) {
  const [id] = useState(`${label}-${Math.random().toString()}`);
  return (
    <div className="col-span-full">
      <label
        htmlFor={id}
        className="block text-sm font-medium leading-6 text-gray-900"
      >
        {label}
      </label>
      <div className="mt-2">
        <input
          type="color"
          name="street-address"
          id={id}
          onChange={e => onChange(e.target.value)}
          value={value}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
        />
      </div>
    </div>
  );
}
