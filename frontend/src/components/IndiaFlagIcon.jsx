import React from "react";

/**
 * A simple, crisp Indian tricolor flag icon drawn as SVG.
 *
 * We use this instead of the 🇮🇳 emoji because flag emoji rendering
 * depends entirely on OS/browser font support — Windows in particular
 * doesn't ship flag glyphs and falls back to showing the literal
 * two-letter code ("IN") as plain text instead of a flag. An SVG has
 * no such dependency: it looks the same everywhere.
 *
 * Renders as a plain rectangle — pair it with a parent that has
 * `overflow-hidden` and rounded corners (as the existing logo badges
 * already do) to get rounded edges for free.
 */
const IndiaFlagIcon = ({ size = 16, className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    aria-hidden="true"
    className={className}
  >
    <rect x="0" y="0" width="24" height="8" fill="#FF9933" />
    <rect x="0" y="8" width="24" height="8" fill="#FFFFFF" />
    <rect x="0" y="16" width="24" height="8" fill="#138808" />
    <circle cx="12" cy="12" r="2.4" fill="none" stroke="#000088" strokeWidth="0.5" />
    <circle cx="12" cy="12" r="0.5" fill="#000088" />
  </svg>
);

export default IndiaFlagIcon;
