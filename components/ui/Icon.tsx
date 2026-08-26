import type { SVGProps } from "react";

// iOS-style icon set rendered as inline SVG. Stroke-based, 1.5 weight,
// 24×24 default, currentColor. No external icon font — keeps the bundle
// slim and the look consistent on every platform.

type IconName =
  | "person.circle"
  | "square.grid.2x2"
  | "clock.arrow.circlepath"
  | "person.crop.circle"
  | "figure.walk"
  | "car"
  | "envelope.open"
  | "timer"
  | "xmark"
  | "checkmark"
  | "chevron.right"
  | "qrcode";

const PATHS: Record<IconName, JSX.Element> = {
  "person.circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M5.5 18.5c.8-2.6 3.4-4.5 6.5-4.5s5.7 1.9 6.5 4.5" />
    </>
  ),
  "square.grid.2x2": (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  "clock.arrow.circlepath": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M19 6l1.5-1.5M19 6l-1.5-1.5" />
    </>
  ),
  "person.crop.circle": (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18c1-2.5 3.2-3.5 5.5-3.5s4.5 1 5.5 3.5" />
    </>
  ),
  "figure.walk": (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="M9 20l3-7-2-3 1.5-4 4 2 3 3" />
      <path d="M14 13l3 7" />
    </>
  ),
  car: (
    <>
      <path d="M5 16v-3l1.5-4.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 13v3" />
      <rect x="3.5" y="13" width="17" height="5" rx="1.5" />
      <circle cx="7.5" cy="17" r="1.4" />
      <circle cx="16.5" cy="17" r="1.4" />
    </>
  ),
  "envelope.open": (
    <>
      <path d="M3.5 8.5l8.5 5 8.5-5" />
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2" />
      <path d="M9 3h6" />
    </>
  ),
  xmark: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  checkmark: (
    <>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </>
  ),
  "chevron.right": (
    <>
      <path d="M9 6l6 6-6 6" />
    </>
  ),
  qrcode: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 18h3M18 14v3" />
    </>
  )
};

export function Icon({
  name,
  className = "h-5 w-5",
  strokeWidth = 1.6,
  ...rest
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
