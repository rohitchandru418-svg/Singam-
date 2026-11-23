"use client";

import type { ReactNode } from "react";

/**
 * A single, consistent line-icon set.
 *
 * Emoji render differently on every platform and read as decoration rather than
 * interface, so the shell uses these monochrome strokes instead. Every icon shares
 * one 24px grid, a 1.7 stroke and round caps, which is what keeps them looking like
 * one family. Colour comes from `currentColor`, so a caller tints them with a class.
 */
export type IconName =
  | "home"
  | "map"
  | "check-square"
  | "rocket"
  | "file-text"
  | "bar-chart"
  | "graduation-cap"
  | "search"
  | "pen"
  | "book"
  | "briefcase"
  | "link"
  | "mic"
  | "ticket"
  | "scales"
  | "file-check"
  | "layers"
  | "bank"
  | "receipt"
  | "currency"
  | "clapperboard"
  | "film"
  | "tv"
  | "users"
  | "calendar"
  | "sprout"
  | "lifebuoy"
  | "clipboard"
  | "refresh"
  | "folder"
  | "settings"
  | "plug"
  | "clock"
  | "shield"
  | "bell"
  | "menu"
  | "chevron-down"
  | "chevron-up"
  | "chevron-right"
  | "check"
  | "play"
  | "pause"
  | "x"
  | "plus"
  | "download"
  | "filter"
  | "alert"
  | "mail"
  | "phone"
  | "logout";

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  "check-square": (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
      <path d="M8 12.5 11 15.5 16 9.5" />
    </>
  ),
  rocket: (
    <>
      <path d="M12 2.5c3.2 1.6 5 4.6 5 8.2L14.5 13h-5L7 10.7c0-3.6 1.8-6.6 5-8.2z" />
      <circle cx="12" cy="8.5" r="1.7" />
      <path d="M7 10.7 4.5 13.5v3.2l3-1.2" />
      <path d="M17 10.7l2.5 2.8v3.2l-3-1.2" />
      <path d="M10 16.5c0 2.3 2 4.5 2 4.5s2-2.2 2-4.5" />
    </>
  ),
  "file-text": (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 15.5h6M9 8.5h2.5" />
    </>
  ),
  "bar-chart": (
    <>
      <path d="M4 20h16" />
      <path d="M6.5 20v-6M11.5 20V8M16.5 20v-9" />
    </>
  ),
  "graduation-cap": (
    <>
      <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
      <path d="M7 11.5v4c0 1.6 2.2 2.8 5 2.8s5-1.2 5-2.8v-4" />
      <path d="M21 9.5V15" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L8 19z" />
      <path d="M13.5 7.5l3 3" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.5C10 5 7 4.2 4 4.2v13.6c3 0 6 .8 8 2.2 2-1.4 5-2.2 8-2.2V4.2c-3 0-6 .8-8 2.3z" />
      <path d="M12 6.5v13.5" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3.5 13h17" />
    </>
  ),
  link: (
    <>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M8 12l-1.8 1.8a3.2 3.2 0 0 0 4.5 4.5L12.5 16.5" />
      <path d="M16 12l1.8-1.8a3.2 3.2 0 0 0-4.5-4.5L11.5 7.5" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M6 11.5a6 6 0 0 0 12 0" />
      <path d="M12 17.5V21M9 21h6" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 7.5h16v2.8a2 2 0 0 0 0 3.4v2.8H4v-2.8a2 2 0 0 0 0-3.4z" />
      <path d="M12 8.5v1.5M12 14v1.5" />
    </>
  ),
  scales: (
    <>
      <path d="M12 4v16" />
      <path d="M7 20h10" />
      <path d="M5 8.5 12 6l7 2.5" />
      <path d="M5 8.5 3 13a3 3 0 0 0 4 0z" />
      <path d="M19 8.5 17 13a3 3 0 0 0 4 0z" />
    </>
  ),
  "file-check": (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 14.5 11 16.5 15 12" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3 3 8l9 5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3 21h18" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21z" />
      <path d="M9.5 8h5M9.5 12h5" />
    </>
  ),
  currency: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10" />
      <path d="M14.8 9.4c-.7-.9-1.8-1.4-2.8-1.4-1.4 0-2.5.8-2.5 2s1 1.7 2.6 2.1c1.6.4 2.6.9 2.6 2.1s-1.1 2-2.5 2c-1 0-2.1-.5-2.8-1.4" />
    </>
  ),
  clapperboard: (
    <>
      <rect x="3" y="9" width="18" height="11" rx="2" />
      <path d="M3.5 9 5 5.5l15 2.2-1.2 1.3z" />
      <path d="M9.5 6.2 8 9M14 6.7l-1.5 2.3" />
    </>
  ),
  film: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M8 4v16M16 4v16" />
      <path d="M3.5 9h4.5M3.5 15h4.5M16 9h4.5M16 15h4.5" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="6.5" width="18" height="12.5" rx="2" />
      <path d="M8 3.5 12 7l4-3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17 14.7c2 .6 3.5 2.3 3.5 4.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3-2-5-5-5 0 3 2 5 5 5z" />
      <path d="M12 11c0-3.3 2.2-5.5 5.5-5.5 0 3.3-2.2 5.5-5.5 5.5z" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M6 6l3.5 3.5M18 6l-3.5 3.5M6 18l3.5-3.5M18 18l-3.5-3.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M9 10h6M9 14h4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-13.7-5.3L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 13.7 5.3L20 16" />
      <path d="M20 20v-4h-4" />
    </>
  ),
  folder: (
    <path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.8-1.4-1.8-3-2.1.8a7.6 7.6 0 0 0-2.6-1.5L14.3 3h-4.6l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.1-.8-1.8 3 1.8 1.4a7.6 7.6 0 0 0 0 3l-1.8 1.4 1.8 3 2.1-.8a7.6 7.6 0 0 0 2.6 1.5l.4 2.4h4.6l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.1.8 1.8-3z" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z" />
      <path d="M12 17v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.3 3 8 7 9.8 4-1.8 7-5.5 7-9.8V5.8z" />
      <path d="M9.3 12l1.9 1.9 3.5-3.8" />
    </>
  ),
  bell: (
    <>
      <path d="M6.5 17V11a5.5 5.5 0 0 1 11 0v6" />
      <path d="M4.5 17h15" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  "chevron-up": <path d="M6 14.5l6-6 6 6" />,
  "chevron-right": <path d="M9.5 6l6 6-6 6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  play: <path d="M7 4.5l12 7.5-12 7.5z" />,
  pause: (
    <>
      <path d="M9 5v14" />
      <path d="M15 5v14" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  download: (
    <>
      <path d="M12 3.5v11" />
      <path d="M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  filter: <path d="M4 5.5h16l-6.2 7.2v5.1l-3.6 1.7v-6.8z" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5M12 16h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.8 7.5 7.1 5.1a2 2 0 0 0 2.2 0l7.1-5.1" />
    </>
  ),
  phone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4.5h3.5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H15" />
      <path d="M10 12h9" />
      <path d="m12.5 8.5-3.5 3.5 3.5 3.5" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-[18px] w-[18px]",
  strokeWidth = 1.7,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
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
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
