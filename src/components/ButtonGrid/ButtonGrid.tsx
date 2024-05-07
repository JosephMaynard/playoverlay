export interface Props {
  className?: string;
  buttons: {
    label: string;
    onClick: () => void;
    color?: string;
    backgroundColor?: string;
    selected?: boolean;
    disabled?: boolean;
  }[];
}

export default function ButtonGrid({ className, buttons }: Props) {
  return (
    <div
      className={`grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 auto-rows-fr${className ? ` ${className}` : ''}`}
    >
      {buttons.map((button, index) => (
        <button
          className={`rounded-lg ${button.backgroundColor ? button.backgroundColor : button.selected ? 'bg-green-300' : 'bg-white hover:bg-gray-50'} px-2 py-3.5 font-semibold disabled:bg-gray-200 disabled:text-gray-400 ${button.color || 'text-gray-900'} shadow-sm ring-1 ring-inset ring-gray-300`}
          onClick={button.onClick}
          key={`${button.label}-${index}`}
          disabled={button.disabled}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
}
