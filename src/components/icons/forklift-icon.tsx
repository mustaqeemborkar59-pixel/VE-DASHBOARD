import type { SVGProps } from "react";
export const ForkliftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 12H5a2 2 0 0 1-2-2V8.5A2.5 2.5 0 0 1 5.5 6h.05" />
    <path d="M20 12h-8" />
    <path d="M12 12V8" />
    <path d="M17 12V6.5a2.5 2.5 0 0 0-5 0V12" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="16" cy="18" r="2" />
  </svg>
);
