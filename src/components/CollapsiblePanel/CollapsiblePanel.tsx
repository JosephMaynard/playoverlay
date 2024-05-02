import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';
import React from 'react';

export interface Props {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  noPanelPadding?: boolean;
}

export default function CollapsiblePanel({
  title,
  children,
  defaultOpen = true,
  className,
  noPanelPadding,
}: Props) {
  return (
    <div
      className={`mx-4 mb-4 overflow-hidden rounded-md border border-gray-200 bg-white shadow lg:mx-auto ${className ? ` ${className}` : ''}`}
    >
      <Disclosure defaultOpen={defaultOpen}>
        {({ open }) => (
          <>
            <Disclosure.Button className="flex w-full justify-between bg-white px-4 py-4 text-left text-sm font-medium hover:bg-gray-200 focus:outline-none focus-visible:ring focus-visible:ring-gray-500/75">
              <span className="text-base font-semibold leading-6 text-gray-900">
                {title}
              </span>
              <ChevronUpIcon
                className={`${
                  open ? 'rotate-180 transform' : ''
                } h-5 w-5 text-gray-500`}
              />
            </Disclosure.Button>
            <Disclosure.Panel
              className={`border-t border-gray-200${noPanelPadding ? '' : ' p-4'}`}
            >
              {children}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
