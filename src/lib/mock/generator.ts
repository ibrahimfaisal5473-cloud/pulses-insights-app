import { AGE_BANDS, type AgeBand, type HeatmapDay, HEATMAP_DAYS } from "@/types";
import { BASE_DAILY_VISITORS, MOCK_ZONES, type MockZone } from "./zones";

/**
 * Deterministic mock analytics generator.
 *
 * Everything is derived from seeded PRNGs keyed on (date, zone, metric), so
 * the same query always returns the same numbers — across requests, reloads,
 * and processes — while still looking organic (weekday rhythm, lunchtime
 * peak, noisy day-to-day variance).
 */

/* ---------- seeded randomness ---------- */

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic PRNG. */
function prng(seedText: string): () => number {
  let a = hashSeed(seedText);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Single deterministic sample in [min, max) for a seed key. */
export function sample(seedText: string, min = 0, max = 1): number {
  return min + prng(seedText)() * (max - min);
}

/** Deterministic integer in [min, max]. */
export function sampleInt(seedText: string, min: number, max: number): number {
  return Math.round(sample(seedText, min, max));
}

/** Deterministic pick from a list. */
export function samplePick<T>(seedText: string, items: readonly T[]): T {
  return items[Math.min(items.length - 1, Math.floor(sample(seedText) * items.length))];
}

/* ---------- calendar helpers ---------- */

/** Date-only ISO string (UTC) for a Date. */
export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of ISO day strings between two dates (UTC days). */
export function eachDay(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  while (cursor.getTime() <= last) {
    days.push(isoDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Mon..Sun label for an ISO day. */
export function dayOfWeek(day: string): HeatmapDay {
  const idx = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  return HEATMAP_DAYS[idx];
}

/* ---------- traffic model ---------- */

/** Weekly rhythm: busy midweek, quiet weekends. */
export function weekdayFactor(day: string): number {
  const dow = dayOfWeek(day);
  if (dow === "Sat") return 0.32;
  if (dow === "Sun") return 0.22;
  const midweekBoost = { Mon: 0.94, Tue: 1.02, Wed: 1.08, Thu: 1.04, Fri: 0.92 }[dow];
  return midweekBoost ?? 1;
}

/** Unique visitors entering a zone on a given day. */
export function zoneDayVisitors(day: string, zone: MockZone): number {
  const jitter = sample(`v:${day}:${zone.id}`, 0.78, 1.22);
  return Math.round(BASE_DAILY_VISITORS * zone.weight * weekdayFactor(day) * jitter);
}

/** Share of a day's visitors that are first-time (new). */
export function newVisitorShare(day: string): number {
  return sample(`new:${day}`, 0.55, 0.68);
}

/** Male share of a day's visitors (rest are female). */
export function maleShare(day: string): number {
  return sample(`gender:${day}`, 0.45, 0.52);
}

/** Age-band weights for a day (jittered around a fixed profile, sums to 1). */
export function ageWeights(day: string): Record<AgeBand, number> {
  const base: Record<AgeBand, number> = {
    "0s": 0.0005,
    "10s": 0.0015,
    "20s": 0.135,
    "30s": 0.66,
    "40s": 0.165,
    "50s": 0.026,
    "60s": 0.0035,
    "70s": 0.0007,
    "80s": 0.0003,
    Unknown: 0.0005,
  };
  let total = 0;
  const jittered = {} as Record<AgeBand, number>;
  for (const band of AGE_BANDS) {
    jittered[band] = base[band] * sample(`age:${day}:${band}`, 0.85, 1.15);
    total += jittered[band];
  }
  for (const band of AGE_BANDS) jittered[band] /= total;
  return jittered;
}

/**
 * Hour-of-day distribution (site opens 07:00, closes 19:00, lunchtime peak).
 * Returns a weight per hour 7..18 summing to 1.
 */
export function hourWeights(day: string): { hour: number; weight: number }[] {
  const hours = Array.from({ length: 12 }, (_, i) => i + 7);
  const raw = hours.map((hour) => {
    const shape = Math.exp(-((hour - 11.5) ** 2) / 14); // peak ~11:30
    const jitter = sample(`h:${day}:${hour}`, 0.8, 1.2);
    return { hour, weight: shape * jitter };
  });
  const total = raw.reduce((s, r) => s + r.weight, 0);
  return raw.map((r) => ({ hour: r.hour, weight: r.weight / total }));
}

/** Site-wide happiness index (0–100) for a day, for the selected zones. */
export function dayHappiness(day: string, zones: MockZone[]): number {
  const zoneOffset =
    zones.reduce((s, z) => s + z.happinessOffset * z.weight, 0) /
    zones.reduce((s, z) => s + z.weight, 0);
  const noise = sample(`hap:${day}`, -3.5, 3.5);
  const value = 84 + zoneOffset + happinessDrift(day) + noise;
  return Math.round(Math.min(97, Math.max(68, value)) * 10) / 10;
}

/** Shared site-wide mood swing for a day — zones drift together. */
function happinessDrift(day: string): number {
  const dayNum = new Date(`${day}T00:00:00Z`).getTime() / 86400000;
  return Math.sin(dayNum / 5.3) * 2.5;
}

/**
 * Happiness index (0–100) for a single zone on a single day.
 *
 * Unlike `dayHappiness`, the noise is seeded per zone, so zones deviate from
 * each other day to day instead of moving in lockstep at a fixed offset —
 * which is what makes the per-zone-over-time grid worth reading.
 */
export function zoneDayHappiness(day: string, zone: MockZone): number {
  const noise = sample(`zhap:${day}:${zone.id}`, -4, 4);
  const value = 84 + zone.happinessOffset + happinessDrift(day) + noise;
  return Math.round(Math.min(97, Math.max(68, value)) * 10) / 10;
}

/**
 * Happiness checks (sentiment samples) recorded in a zone on a day.
 *
 * Sampling is continuous while a visitor is present, so the count scales with
 * dwell time — roughly one check per three minutes — not just headcount.
 */
export function zoneDayChecks(day: string, zone: MockZone): number {
  const perVisitor = zone.dwellMinutes / 3;
  const jitter = sample(`chk:${day}:${zone.id}`, 0.85, 1.15);
  return Math.round(zoneDayVisitors(day, zone) * perVisitor * jitter);
}

/**
 * Stable happiness offsets per demographic segment, so "Happiness by
 * Gender/Age" reads consistently rather than reshuffling each request.
 */
export function segmentHappinessOffset(segment: string): number {
  return sample(`seg:${segment}`, -2.6, 2.6);
}

/* ---------- demographic cohort ---------- */

/**
 * The gender/age slice a query asks for. An empty list means "all", matching
 * how the filter UI and query string encode an unfiltered dimension.
 */
export type Cohort = {
  genders: string[];
  ages: AgeBand[];
};

/** Share of a day's visitors matching the selected genders. */
export function genderShare(day: string, genders: string[]): number {
  if (genders.length === 0) return 1;
  const male = maleShare(day);
  return (
    (genders.includes("male") ? male : 0) +
    (genders.includes("female") ? 1 - male : 0)
  );
}

/** Share of a day's visitors falling in the selected age bands. */
export function ageShare(day: string, ages: AgeBand[]): number {
  if (ages.length === 0) return 1;
  const weights = ageWeights(day);
  return ages.reduce((sum, band) => sum + weights[band], 0);
}

/**
 * How much of a day's traffic survives the demographic filters.
 *
 * Gender and age are modelled as independent, so the retained share is the
 * product of the two — asking for "female, 30s" keeps female% × 30s% of the
 * day. Real data would have them correlated; the mock deliberately does not,
 * because an independent product is the assumption a reader can predict.
 */
export function demographicShare(day: string, cohort: Cohort): number {
  return genderShare(day, cohort.genders) * ageShare(day, cohort.ages);
}

/** Unique visitors entering a zone on a day, narrowed to the cohort. */
export function cohortDayVisitors(
  day: string,
  zone: MockZone,
  cohort: Cohort,
): number {
  return Math.round(zoneDayVisitors(day, zone) * demographicShare(day, cohort));
}

/**
 * Happiness shift from narrowing to a cohort — the mean of the selected
 * segments' offsets, so filtering to a happier group lifts the score. Zero
 * when nothing is filtered, which keeps the unfiltered numbers untouched.
 *
 * The per-segment breakdown endpoints deliberately skip this: they already
 * apply their own segment offset, and adding both would double-count.
 */
export function cohortHappinessOffset(cohort: Cohort): number {
  const offsets = [
    ...cohort.genders.map((g) => segmentHappinessOffset(`gender:${g}`)),
    ...cohort.ages.map((a) => segmentHappinessOffset(`age:${a}`)),
  ];
  if (offsets.length === 0) return 0;
  return offsets.reduce((sum, o) => sum + o, 0) / offsets.length;
}

/* ---------- misc ---------- */

/** Resolve zone ids (empty = all zones); unknown ids are ignored. */
export function resolveZones(zoneIds: string[]): MockZone[] {
  if (zoneIds.length === 0) return MOCK_ZONES;
  const matched = MOCK_ZONES.filter((z) => zoneIds.includes(z.id));
  return matched.length > 0 ? matched : MOCK_ZONES;
}

/** Small artificial latency so loading states are visible in the UI. */
export function mockLatency(): Promise<void> {
  const ms = 200 + Math.random() * 300;
  return new Promise((resolve) => setTimeout(resolve, ms));
}
