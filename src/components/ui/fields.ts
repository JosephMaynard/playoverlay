// Shared form field classes. Inputs are 48px tall like the buttons, so a
// settings drawer on a tablet is as tappable as the match controls.
export const inputClassName =
  'block w-full min-h-12 rounded border-0 bg-surface px-3 py-2 text-base text-fg shadow-sm ring-1 ring-inset ring-line placeholder:text-faint focus:ring-2 focus:ring-inset focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

// For short, dense fields (shirt numbers, ports) that sit in a row.
export const compactInputClassName =
  'block min-h-12 rounded border-0 bg-surface px-2 py-2 text-base text-fg shadow-sm ring-1 ring-inset ring-line placeholder:text-faint focus:ring-2 focus:ring-inset focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

export const textareaClassName =
  'block w-full rounded border-0 bg-surface px-3 py-2 text-base text-fg shadow-sm ring-1 ring-inset ring-line placeholder:text-faint focus:ring-2 focus:ring-inset focus:ring-accent';

export const selectClassName =
  'block w-full min-h-12 rounded border-0 bg-surface py-2 pl-3 pr-10 text-base text-fg shadow-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-inset focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

export const checkboxClassName =
  'h-6 w-6 rounded border-line-strong bg-surface text-accent focus:ring-accent focus:ring-offset-surface';

export const radioClassName =
  'h-6 w-6 border-line-strong bg-surface text-accent focus:ring-accent focus:ring-offset-surface';

export const labelClassName = 'block text-sm font-semibold text-fg';

export const helpTextClassName = 'mt-1 text-sm text-muted';

export const errorTextClassName = 'mt-1 text-sm font-medium text-danger';

// Section heading inside a panel or drawer.
export const sectionHeadingClassName = 'text-base font-semibold text-fg';
