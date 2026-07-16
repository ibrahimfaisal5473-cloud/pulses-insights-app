/**
 * Semicircular visitor-mood gauge (0–10), matching the Insights convention
 * where sentiment reads green. `pathLength={100}` lets the fill be set
 * straight from a percentage without measuring the arc.
 */
export function MoodGauge({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, (score / 10) * 100));

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width="190" height="106" viewBox="0 0 190 106" role="img" aria-label={`Visitor mood ${score.toFixed(1)} out of 10`}>
          <defs>
            <linearGradient id="moodFill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#B6C99A" />
              <stop offset="100%" stopColor="#4E7A2E" />
            </linearGradient>
          </defs>
          <path
            d="M17 96 A78 78 0 0 1 173 96"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M17 96 A78 78 0 0 1 173 96"
            fill="none"
            stroke="url(#moodFill)"
            strokeWidth="13"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 - pct}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 flex items-baseline justify-center gap-0.5">
          <span className="font-heading text-3xl font-semibold tabular-nums">
            {score.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/10</span>
        </div>
      </div>
      <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        Visitor Mood
      </span>
    </div>
  );
}
