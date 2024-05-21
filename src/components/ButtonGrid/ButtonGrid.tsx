import Button, { Props as ButtonProps } from './Button';

export interface Props {
  className?: string;
  buttons: ButtonProps[];
  compact?: boolean;
}

export default function ButtonGrid({ className, buttons, compact }: Props) {
  return (
    <div
      className={`grid w-full grid-cols-1 gap-2 ${compact ? 'md:grid-cols-2' : 'sm:grid-cols-2 md:grid-cols-3'} auto-rows-fr${className ? ` ${className}` : ''}`}
    >
      {buttons.map((button, index) => (
        <Button
          onClick={button.onClick}
          key={`${button.label}-${index}`}
          disabled={button.disabled}
          icon={button.icon}
          label={button.label}
          color={button.color}
          backgroundColor={button.backgroundColor}
          selected={button.selected}
        />
      ))}
    </div>
  );
}
