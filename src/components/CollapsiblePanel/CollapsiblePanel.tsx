import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import React from 'react';
import { classNames } from '@playoverlay/core';

export interface Props {
  title: string;
  // Shown beside the title, e.g. a status that matters while collapsed.
  badge?: React.ReactNode;
  // Controls shown on the right of the header, before the chevron.
  actions?: React.ReactNode;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  noPanelPadding?: boolean;
}

export default function CollapsiblePanel({
  title,
  badge,
  actions,
  children,
  defaultOpen = true,
  className,
  noPanelPadding,
}: Props) {
  return (
    <div
      className={classNames(
        'mx-4 mb-4 overflow-hidden rounded-xl border border-line bg-surface shadow-sm lg:mx-0',
        className ?? ''
      )}
    >
      <Disclosure defaultOpen={defaultOpen}>
        {({ open }) => (
          <>
            <div className="flex items-center">
              {/* The whole header is the toggle: a 56px row is easier to
                  hit than a chevron, and a collapsed panel still tells you
                  what it is. */}
              <Disclosure.Button className="flex min-h-14 flex-1 items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                <span className="flex min-w-0 items-center gap-x-2 text-lg font-semibold leading-6 text-fg">
                  <span className="truncate">{title}</span>
                  {badge}
                </span>
                <ChevronDownIcon
                  className={classNames(
                    'h-6 w-6 flex-shrink-0 text-muted transition-transform',
                    open ? 'rotate-180' : ''
                  )}
                  aria-hidden="true"
                />
              </Disclosure.Button>
              {actions && (
                <div className="flex items-center pr-3">{actions}</div>
              )}
            </div>
            <Disclosure.Panel
              className={
                noPanelPadding
                  ? 'border-t border-line'
                  : 'border-t border-line p-4'
              }
            >
              {children}
            </Disclosure.Panel>
          </>
        )}
      </Disclosure>
    </div>
  );
}
