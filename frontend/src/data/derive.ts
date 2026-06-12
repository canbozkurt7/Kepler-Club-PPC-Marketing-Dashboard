import type { DashboardData, Kpis, TrendPoint } from "./types";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
}

function kpisFromTrend(base: Kpis, trend: TrendPoint[], fullSpend: number): Kpis {
  const spend = trend.reduce((s, p) => s + p.spend, 0);
  const revenue = trend.reduce((s, p) => s + p.revenue, 0);
  const conversions = trend.reduce((s, p) => s + p.conversions, 0);
  const frac = fullSpend > 0 ? spend / fullSpend : 0;
  const clicks = Math.round(base.clicks * frac);
  const impressions = Math.round(base.impressions * frac);
  return {
    spend,
    revenue,
    conversions,
    clicks,
    impressions,
    roas: spend > 0 ? +(revenue / spend).toFixed(2) : 0,
    cpa: conversions > 0 ? +(spend / conversions).toFixed(2) : 0,
    ctr: base.ctr,
    cpc: base.cpc,
  };
}

/**
 * Recomputes the dashboard payload for a selected date range.
 * Trend-backed metrics (spend/revenue/conversions/ROAS/CPA) are exact sums of
 * the filtered days; count-style metrics without daily series (clicks,
 * sessions, campaign rows) are scaled proportionally.
 */
export function deriveForRange(base: DashboardData, range: DateRange): DashboardData {
  const inRange = (d: string) => d >= range.from && d <= range.to;
  const trend = base.trend.filter((p) => inRange(p.date));

  if (trend.length === 0 || trend.length === base.trend.length) {
    return base;
  }

  const frac = trend.length / base.trend.length;
  const scale = (v: number) => Math.round(v * frac);

  const platformTrends = {
    google: base.trendByPlatform.google.filter((p) => inRange(p.date)),
    meta: base.trendByPlatform.meta.filter((p) => inRange(p.date)),
    yandex: base.trendByPlatform.yandex.filter((p) => inRange(p.date)),
  };

  const trendByCampaign: Record<string, TrendPoint[]> = {};
  for (const [id, pts] of Object.entries(base.trendByCampaign ?? {})) {
    trendByCampaign[id] = pts.filter((p) => inRange(p.date));
  }

  return {
    ...base,
    trend,
    trendByPlatform: platformTrends,
    trendByCampaign,
    kpis: {
      blended: kpisFromTrend(base.kpis.blended, trend, base.kpis.blended.spend),
      google: kpisFromTrend(base.kpis.google, platformTrends.google, base.kpis.google.spend),
      meta: kpisFromTrend(base.kpis.meta, platformTrends.meta, base.kpis.meta.spend),
      yandex: kpisFromTrend(base.kpis.yandex, platformTrends.yandex, base.kpis.yandex.spend),
    },
    campaigns: base.campaigns.map((c) => {
      const spend = +(c.spend * frac).toFixed(0);
      const revenue = +(c.revenue * frac).toFixed(0);
      const conversions = Math.max(1, scale(c.conversions));
      return {
        ...c,
        spend,
        revenue,
        conversions,
        clicks: scale(c.clicks),
        impressions: scale(c.impressions),
        cpa: +(spend / conversions).toFixed(2),
      };
    }),
    locations: base.locations.map((l) => ({
      ...l,
      spend: scale(l.spend),
      conversions: scale(l.conversions),
    })),
    ga4: {
      ...base.ga4,
      sessions: scale(base.ga4.sessions),
      engagedSessions: scale(base.ga4.engagedSessions),
      conversions: scale(base.ga4.conversions),
      transactions: scale(base.ga4.transactions ?? 0),
      topChannels: base.ga4.topChannels.map((ch) => ({
        ...ch,
        sessions: scale(ch.sessions),
        conversions: scale(ch.conversions),
      })),
    },
    clarity: {
      ...base.clarity,
      totalSessions: scale(base.clarity.totalSessions),
      users: scale(base.clarity.users ?? 0),
      pages: base.clarity.pages.map((p) => ({
        ...p,
        sessions: scale(p.sessions),
        deadClicks: scale(p.deadClicks),
        rageClicks: scale(p.rageClicks),
      })),
    },
  };
}
