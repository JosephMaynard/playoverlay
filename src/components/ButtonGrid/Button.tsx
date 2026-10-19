import ActionButton, {
  ActionButtonSelectedTone,
  ActionButtonSize,
  ActionButtonVariant,
} from '../ui/ActionButton';

export interface Props {
  label: string;
  onClick: () => void;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  // Older call sites pass Tailwind colour classes; they map onto the
  // semantic variants so everything themes together. Prefer `variant`.
  color?: string;
  backgroundColor?: string;
  selected?: boolean;
  selectedTone?: ActionButtonSelectedTone;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

function variantFromLegacyColour(
  backgroundColor: string | undefined
): ActionButtonVariant {
  if (!backgroundColor) return 'secondary';
  if (backgroundColor.startsWith('bg-red')) return 'danger';
  if (backgroundColor.startsWith('bg-green')) return 'live';
  if (
    backgroundColor.startsWith('bg-indigo') ||
    backgroundColor.startsWith('bg-blue')
  ) {
    return 'primary';
  }
  return 'secondary';
}

export default function Button({
  label,
  onClick,
  variant,
  size,
  backgroundColor,
  selected,
  selectedTone,
  disabled,
  icon,
  className,
}: Props) {
  return (
    <ActionButton
      variant={variant ?? variantFromLegacyColour(backgroundColor)}
      size={size}
      selected={selected}
      selectedTone={selectedTone}
      disabled={disabled}
      icon={icon}
      className={className}
      onClick={onClick}
    >
      {label}
    </ActionButton>
  );
}
