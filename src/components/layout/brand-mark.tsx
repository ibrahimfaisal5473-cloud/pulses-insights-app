/**
 * Pulses Insights brand mark — teal gradient tile with a pulse waveform.
 * Shared by the app shell (sidebar, mobile header).
 */
export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        height: size,
        width: size,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.28,
        background: "linear-gradient(140deg, #0F766E, #14B8A6)",
        boxShadow: "0 4px 14px rgba(15,118,110,0.35)",
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M2 12h4l2.5-7 4 15 3-11 2 3h4.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
