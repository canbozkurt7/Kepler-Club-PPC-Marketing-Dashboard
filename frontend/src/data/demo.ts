import type {
  CampaignRow,
  DashboardData,
  Kpis,
  PlatformKey,
  TrendPoint,
} from "./types";

/*
 * Demo dataset modeled on real Kepler Club numbers (May 2026 reports):
 * SAW ~14x ROAS, KLIA ~6.8x, RIX ~8.8x. Used until the live API has data,
 * so the dashboard renders meaningfully on first deploy.
 */

const DAYS = 30;

function seeded(seed: number) {
  // Deterministic pseudo-random so demo charts are stable between reloads
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildTrend(
  base: { spend: number; roas: number },
  seed: number
): TrendPoint[] {
  const rand = seeded(seed);
  const points: TrendPoint[] = [];
  const today = new Date("2026-06-10");
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 1.18 : 1;
    const noise = 0.82 + rand() * 0.4;
    const spend = Math.round(base.spend * weekend * noise);
    const roas = +(base.roas * (0.85 + rand() * 0.35)).toFixed(2);
    const revenue = Math.round(spend * roas);
    points.push({
      date: d.toISOString().slice(0, 10),
      spend,
      revenue,
      roas,
      conversions: Math.max(1, Math.round(revenue / 95)),
    });
  }
  return points;
}

function kpisFromTrend(trend: TrendPoint[], ctr: number, cpc: number): Kpis {
  const spend = trend.reduce((s, p) => s + p.spend, 0);
  const revenue = trend.reduce((s, p) => s + p.revenue, 0);
  const conversions = trend.reduce((s, p) => s + p.conversions, 0);
  const clicks = Math.round(spend / cpc);
  const impressions = Math.round(clicks / (ctr / 100));
  return {
    spend,
    revenue,
    conversions,
    clicks,
    impressions,
    roas: +(revenue / spend).toFixed(2),
    cpa: +(spend / conversions).toFixed(2),
    ctr,
    cpc,
  };
}

const googleTrend = buildTrend({ spend: 410, roas: 10.4 }, 7);
const metaTrend = buildTrend({ spend: 165, roas: 5.6 }, 21);
const yandexTrend = buildTrend({ spend: 70, roas: 7.1 }, 42);

const google = kpisFromTrend(googleTrend, 8.4, 0.42);
const meta = kpisFromTrend(metaTrend, 2.1, 0.61);
const yandex = kpisFromTrend(yandexTrend, 5.2, 0.28);

const blendedTrend: TrendPoint[] = googleTrend.map((p, i) => {
  const spend = p.spend + metaTrend[i].spend + yandexTrend[i].spend;
  const revenue = p.revenue + metaTrend[i].revenue + yandexTrend[i].revenue;
  return {
    date: p.date,
    spend,
    revenue,
    roas: +(revenue / spend).toFixed(2),
    conversions:
      p.conversions + metaTrend[i].conversions + yandexTrend[i].conversions,
  };
});

const blended: Kpis = {
  spend: google.spend + meta.spend + yandex.spend,
  revenue: google.revenue + meta.revenue + yandex.revenue,
  conversions: google.conversions + meta.conversions + yandex.conversions,
  clicks: google.clicks + meta.clicks + yandex.clicks,
  impressions: google.impressions + meta.impressions + yandex.impressions,
  roas: 0,
  cpa: 0,
  ctr: 0,
  cpc: 0,
};
blended.roas = +(blended.revenue / blended.spend).toFixed(2);
blended.cpa = +(blended.spend / blended.conversions).toFixed(2);
blended.ctr = +((blended.clicks / blended.impressions) * 100).toFixed(2);
blended.cpc = +(blended.spend / blended.clicks).toFixed(2);

function c(
  id: string,
  name: string,
  platform: PlatformKey,
  location: CampaignRow["location"],
  spend: number,
  roas: number,
  ctr: number,
  status: CampaignRow["status"] = "ACTIVE"
): CampaignRow {
  const revenue = Math.round(spend * roas);
  const conversions = Math.max(1, Math.round(revenue / 95));
  const cpc = platform === "yandex" ? 0.28 : platform === "meta" ? 0.61 : 0.42;
  const clicks = Math.round(spend / cpc);
  return {
    id,
    name,
    platform,
    location,
    status,
    spend,
    revenue,
    conversions,
    clicks,
    impressions: Math.round(clicks / (ctr / 100)),
    roas,
    cpa: +(spend / conversions).toFixed(2),
    ctr,
  };
}

const campaigns: CampaignRow[] = [
  c("g1", "SAW - Search Global", "google", "SAW", 5810, 14.42, 9.2),
  c("g2", "SAW - Search Lounge", "google", "SAW", 1240, 11.8, 7.7),
  c("g3", "KUL - Search Global", "google", "KLIA", 2980, 6.81, 7.9),
  c("g4", "RIX - Search Global", "google", "RIX", 1410, 8.79, 8.8),
  c("g5", "SAW - PMax Rooms", "google", "SAW", 860, 6.2, 4.1),
  c("m1", "SAW - Prospecting Reels", "meta", "SAW", 2120, 5.9, 2.3),
  c("m2", "SAW - Retargeting 14d", "meta", "SAW", 980, 8.4, 3.4),
  c("m3", "KUL - Prospecting Interests", "meta", "KLIA", 1240, 4.2, 1.8),
  c("m4", "RIX - Retargeting 30d", "meta", "RIX", 410, 6.7, 2.9, "PAUSED"),
  c("y1", "SAW - Search RU", "yandex", "SAW", 1310, 7.8, 6.1),
  c("y2", "SAW - Display RU", "yandex", "SAW", 480, 4.9, 1.2),
  c("y3", "RIX - Search RU", "yandex", "RIX", 320, 6.4, 5.4),
];

export const demoData: DashboardData = {
  source: "demo",
  updatedAt: new Date().toISOString(),
  kpis: { blended, google, meta, yandex },
  trend: blendedTrend,
  trendByPlatform: {
    google: googleTrend,
    meta: metaTrend,
    yandex: yandexTrend,
  },
  campaigns,
  alerts: [
    {
      id: "a1",
      severity: "CRITICAL",
      message: "ROAS dropped below 1.5 on KUL - Prospecting Interests",
      location: "KLIA",
      platform: "meta",
      triggeredAt: "2026-06-10T09:14:00Z",
    },
    {
      id: "a2",
      severity: "HIGH",
      message: "CPA above €200 on SAW - PMax Rooms (€214)",
      location: "SAW",
      platform: "google",
      triggeredAt: "2026-06-10T07:02:00Z",
    },
    {
      id: "a3",
      severity: "MEDIUM",
      message: "CPA up 27% day-over-day on SAW - Display RU",
      location: "SAW",
      platform: "yandex",
      triggeredAt: "2026-06-09T18:45:00Z",
    },
  ],
  locations: [
    { code: "SAW", city: "Istanbul", spend: 12800, roas: 11.6, conversions: 1430 },
    { code: "KLIA", city: "Kuala Lumpur", spend: 4220, roas: 5.9, conversions: 262 },
    { code: "RIX", city: "Riga", spend: 2140, roas: 8.1, conversions: 183 },
  ],
  ga4: {
    sessions: 184210,
    engagedSessions: 96710,
    engagementRate: 52.5,
    avgSessionSec: 164,
    conversions: 4310,
    topChannels: [
      { channel: "Paid Search", sessions: 71200, conversions: 2210 },
      { channel: "Organic Search", sessions: 48900, conversions: 980 },
      { channel: "Paid Social", sessions: 31400, conversions: 640 },
      { channel: "Direct", sessions: 22100, conversions: 390 },
      { channel: "Referral", sessions: 10610, conversions: 90 },
    ],
  },
  clarity: {
    totalSessions: 162400,
    deadClickRate: 4.8,
    rageClickRate: 1.2,
    bounceRate: 61.0,
    avgLoadMs: 5400,
    pages: [
      { url: "/booking/date-select", sessions: 64100, deadClicks: 4120, rageClicks: 880, bounceRate: 48.2, avgLoadMs: 3900 },
      { url: "/rooms/saw", sessions: 38800, deadClicks: 2980, rageClicks: 410, bounceRate: 55.4, avgLoadMs: 4800 },
      { url: "/lounge/saw", sessions: 21500, deadClicks: 760, rageClicks: 120, bounceRate: 63.8, avgLoadMs: 6100 },
      { url: "/", sessions: 19800, deadClicks: 540, rageClicks: 95, bounceRate: 66.1, avgLoadMs: 7200 },
      { url: "/checkout", sessions: 9400, deadClicks: 1230, rageClicks: 310, bounceRate: 31.5, avgLoadMs: 3100 },
    ],
  },
};
