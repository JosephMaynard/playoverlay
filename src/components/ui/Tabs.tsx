import type { ReactNode } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { classNames } from '@playoverlay/core';

export interface TabItem {
  key: string;
  label: string;
  // A coloured dot before the label for a tab that wants attention while
  // it is not selected (the go-live check with a warning).
  dot?: 'warn' | 'danger' | 'live';
  // Keeps the panel mounted while hidden, for content that does work on
  // mount (the preflight checks) or holds a draft.
  keepMounted?: boolean;
  content: ReactNode;
}

export interface Props {
  tabs: TabItem[];
  // An accessible name for the tab list.
  label: string;
  className?: string;
}

const dotClasses = {
  warn: 'bg-warn',
  danger: 'bg-danger',
  live: 'bg-live',
};

// A flat tab group: a strip of underlined tabs flush with the top of the
// panel, no rounded tabs, no gap above. Two of these hold everything on the
// dashboard that is not the preview, the clock or the goal keys, so the
// pinned controls get the vertical space.
export default function Tabs({ tabs, label, className }: Props) {
  return (
    <TabGroup
      as="div"
      className={classNames(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-sm',
        className ?? ''
      )}
    >
      <TabList
        aria-label={label}
        className="flex flex-shrink-0 gap-1 border-b border-line bg-surface-2 px-2"
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            className="-mb-px inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-base font-semibold text-muted transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent data-[selected]:border-accent data-[selected]:text-fg"
          >
            {tab.dot && (
              <span
                aria-hidden="true"
                className={classNames(
                  'h-2 w-2 rounded-full',
                  dotClasses[tab.dot]
                )}
              />
            )}
            {tab.label}
          </Tab>
        ))}
      </TabList>
      <TabPanels className="min-h-0 flex-1 overflow-y-auto">
        {tabs.map((tab) => (
          <TabPanel
            key={tab.key}
            unmount={!tab.keepMounted}
            className="p-4 focus:outline-none"
          >
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </TabGroup>
  );
}
