import Button, { Props as ButtonProps } from './Button';
import { classNames } from '@playoverlay/core';
import type { ActionButtonSize } from '../ui/ActionButton';

export interface Props {
  className?: string;
  buttons: ButtonProps[];
  compact?: boolean;
  // Applied to every button unless the button sets its own.
  size?: ActionButtonSize;
}

export default function ButtonGrid({
  className,
  buttons,
  compact,
  size,
}: Props) {
  return (
    <div
      className={classNames(
        'grid w-full auto-rows-fr gap-2',
        compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3',
        className ?? ''
      )}
    >
      {buttons.map((button, index) => (
        <Button
          key={`${button.label}-${index}`}
          {...button}
          size={button.size ?? size}
        />
      ))}
    </div>
  );
}
