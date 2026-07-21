export interface Props {
  label: string;
  onClick: () => void;
  color?: string;
  backgroundColor?: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export default function Button({
  label,
  onClick,
  color,
  backgroundColor,
  selected,
  disabled,
  icon,
  className,
}: Props) {
  return (
    <button
      className={`${icon ? 'inline-flex items-center gap-x-1.5' : ''} rounded-lg ${backgroundColor ? backgroundColor : selected ? 'bg-green-300' : 'bg-white hover:bg-gray-50'} ${icon ? 'px-3.5' : 'px-2'} py-3.5 font-semibold disabled:bg-gray-200 disabled:text-gray-400 ${color || 'text-gray-900'} shadow-sm ring-1 ring-inset ring-gray-300${className ? ` ${className}` : ''}`}
      onClick={onClick}
      disabled={disabled}
      // Only a genuine toggle/selected-state button passes `selected` at
      // all (screen/phase/language pickers and similar segmented controls);
      // plain action buttons (Stop, Clear, …) leave it undefined, which
      // omits the attribute entirely rather than announcing a false
      // "not pressed" state.
      aria-pressed={selected === undefined ? undefined : selected}
    >
      {icon}
      {label}
    </button>
  );
}
