/**
 * Pulses brand mark — a teal rounded tile with a folded bottom-left corner
 * and a "P" counter, recreated in the Pulses Insights brand colour.
 * Shared by the app shell (sidebar, header) and the login screen; the same
 * artwork backs the favicon at `app/icon.svg`.
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Pulses"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M9 2H23A7 7 0 0 1 30 9V23A7 7 0 0 1 23 30H12L2 20V9A7 7 0 0 1 9 2Z"
        fill="#0F766E"
      />
      <path d="M2 20L12 30H2Z" fill="#0B564F" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 8H18A6 6 0 0 1 18 20H15V24H11V8ZM15 11H18A3 3 0 0 1 18 17H15V11Z"
        fill="#ffffff"
      />
    </svg>
  );
}
