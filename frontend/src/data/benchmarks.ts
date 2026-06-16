import type { PlatformKey } from "./types";

/**
 * Static published industry medians, used as a *reference strip* only.
 * There is no reliable free real-time benchmark API, so these are hand-curated
 * from published 2026 reports and must be reviewed each quarter.
 *
 * NOTE: Kepler Club runs 6–14x ROAS — far above these generic medians — so the
 * primary comparison in the UI is the self-baseline (vs your own prior period).
 * This strip is context, not a target.
 */
export const BENCHMARKS_AS_OF = "Q2 2026";

export const INDUSTRY_BENCHMARKS: Record<
  PlatformKey | "blended",
  { roas: number; ctr: number }
> = {
  blended: { roas: 2.8, ctr: 3.5 },
  google: { roas: 3.31, ctr: 3.17 },
  meta: { roas: 2.3, ctr: 1.5 },
  yandex: { roas: 2.1, ctr: 4.8 },
};
