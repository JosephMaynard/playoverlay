import Button, { Props as ButtonProps } from './Button';
import { classNames } from '@playoverlay/core';
import type {
  ActionButtonSelectedTone,
  ActionButtonSize,
} from '../ui/ActionButton';

export interface Props {
  className?: string;
  buttons: ButtonProps[];
  compact?: boolean;
  // Column count from md up (2 below it). compact is the older spelling
  // of columns={2}.
  columns?: 1 | 2 | 3 | 4;
  // Applied to every button unless the button sets its own.
  size?: ActionButtonSize;
  // What a selected button in this grid means (see ActionButton).
  selectedTone?: ActionButtonSelectedTone;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
};

export default function ButtonGrid({
  className,
  buttons,
  compact,
  columns,
  size,
  selectedTone,
}: Props) {
  return (
    <div
      className={classNames(
        'grid w-full auto-rows-fr gap-1.5',
        columnClasses[columns ?? (compact ? 2 : 3)],
        className ?? ''
      )}
    >
      {buttons.map((button, index) => (
        <Button
          key={`${button.label}-${index}`}
          {...button}
          size={button.size ?? size}
          selectedTone={button.selectedTone ?? selectedTone}
        />
      ))}
    </div>
  );
}
