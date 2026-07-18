/**
 * Continuous sentiment colour ramp (unhappy → happy) for the Happiness lens.
 *
 * Every stop is dark enough to carry white text, since these fill chart blocks
 * that render their figure on top. The domain starts at 50 rather than 0: a
 * happiness index realistically sits in the upper half, so spreading the ramp
 * over 0–100 would render every zone an identical green.
 */

const DOMAIN_MIN = 50;
const DOMAIN_MAX = 95;

/** Ramp stops from unhappy to happy, as [r, g, b]. */
const STOPS: [number, number, number][] = [
  [163, 35, 32], // deep red
  [184, 134, 47], // amber
  [110, 139, 61], // olive (chart.happiness)
  [63, 99, 37], // deep green
];

/** Colour for a happiness index (0–100). Clamped to the ramp's domain. */
export function sentimentColor(happiness: number): string {
  const t = clamp((happiness - DOMAIN_MIN) / (DOMAIN_MAX - DOMAIN_MIN), 0, 1);

  const scaled = t * (STOPS.length - 1);
  const i = Math.min(Math.floor(scaled), STOPS.length - 2);
  const [from, to] = [STOPS[i], STOPS[i + 1]];
  const local = scaled - i;

  const [r, g, b] = from.map((c, j) => Math.round(c + (to[j] - c) * local));
  return `rgb(${r}, ${g}, ${b})`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
