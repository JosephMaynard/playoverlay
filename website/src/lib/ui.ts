// Shared class strings for the few repeated controls, so buttons look and
// behave the same everywhere without a component library.

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors";

export const buttonPrimary = `${buttonBase} bg-primary text-on-primary shadow-sm hover:bg-primary-hover`;

export const buttonSecondary = `${buttonBase} border border-line-strong bg-surface text-fg hover:border-fg/40 hover:bg-subtle`;

/** Buttons on the always-navy hero and closing sections. */
export const buttonOnNavyPrimary = `${buttonBase} bg-white text-navy shadow-sm hover:bg-[#dce5f5]`;

export const buttonOnNavySecondary = `${buttonBase} border border-white/35 text-white hover:border-white/70 hover:bg-white/10`;

export const eyebrow = "text-xs font-semibold uppercase tracking-[0.14em] text-accent-text";

export const sectionTitle = "text-3xl font-bold tracking-tight text-fg sm:text-4xl";

export const textLink =
  "font-medium text-link underline decoration-1 underline-offset-[3px] hover:decoration-2";
