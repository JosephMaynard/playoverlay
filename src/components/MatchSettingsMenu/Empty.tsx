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
        className="mx-auto h-12 w-12 text-gray-400"
      />

      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}
