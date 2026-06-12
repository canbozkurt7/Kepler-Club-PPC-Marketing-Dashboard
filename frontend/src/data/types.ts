export type PlatformKey = "google" | "meta" | "yandex";
export type LocationCode = "ALL" | "SAW" | "KLIA" | "RIX";

export interface Kpis {
  spend: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  ctr: number;
  cpc: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  spend: number;
  revenue: number;
  roas: number;
  conversions: number;
}

export interface CampaignRow {
  id: string;
  name: string;
  platform: PlatformKey;
  location: Exclude<LocationCode, "ALL">;
  status: "ACTIVE" | "PAUSED";
  spend: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  ctr: number;
}

export interface AlertItem {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  location: string;
  platform: string;
  triggeredAt: string;
}

export interface LocationSummary {
  code: Exclude<LocationCode, "ALL">;
  city: string;
  spend: number;
  roas: number;
  conversions: number;
}

export interface Ga4Snapshot {
  sessions: number;
  engagedSessions: number;
  engagementRate: number;
  avgSessionSec: number;
  conversions: number;
  revenue: number;
  topChannels: { channel: string; sessions: number; conversions: number; revenue: number }[];
  devices: { device: string; sessions: number; conversions: number; revenue: number }[];
  countries: { country: string; sessions: number; conversions: number }[];
  pages: { title: string; sessions: number; conversions: number; revenue: number }[];
}

export interface ClarityPageRow {
  url: string;
  sessions: number;
  deadClicks: number;
  rageClicks: number;
  bounceRate: number;
  avgLoadMs: number;
}

export interface ClaritySnapshot {
  totalSessions: number;
  deadClickRate: number;
  rageClickRate: number;
  bounceRate: number;
  avgLoadMs: number;
  pages: ClarityPageRow[];
}

export interface DashboardData {
  source: "live" | "demo";
  updatedAt: string;
  /** Full span of synced data (independent of the requested window). */
  dataBounds?: { min: string | null; max: string | null };
  kpis: Record<PlatformKey | "blended", Kpis>;
  trend: TrendPoint[];
  trendByPlatform: Record<PlatformKey, TrendPoint[]>;
  campaigns: CampaignRow[];
  alerts: AlertItem[];
  locations: LocationSummary[];
  ga4: Ga4Snapshot;
  clarity: ClaritySnapshot;
}
