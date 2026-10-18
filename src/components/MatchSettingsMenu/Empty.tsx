import { NoSymbolIcon } from '@heroicons/react/24/outline';

export interface Props {
  title: string;
  description?: string;
}

export default function Empty({ title, description }: Props) {
  return (
    <div className="py-8 text-center">
      <NoSymbolIcon
        aria-hidden="true"
        className="mx-auto h-12 w-12 text-faint"
      />

      <h3 className="mt-2 text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
