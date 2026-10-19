import type { SVGProps } from 'react';

// Two arrows, one in and one out: the substitution board's own symbol.
export default function SubstitutionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 7h13M14 3l4 4-4 4" />
      <path d="M20 17H7M10 13l-4 4 4 4" />
    </svg>
  );
}
