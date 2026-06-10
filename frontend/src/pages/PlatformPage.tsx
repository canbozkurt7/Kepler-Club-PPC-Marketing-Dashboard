import type { DashboardData, LocationCode, PlatformKey } from "../data/types";
import {
  Card,
  CampaignTable,
  KpiCard,
  PLATFORM_META,
  eur,
  num,
} from "../components/ui";
import { MiniAreaChart, SpendRoasChart } from "../components/TrendChart";

const PHASE_NOTE: Partial<Record<PlatformKey, string>> = {
  meta: "Meta Ads API sync ships in Phase 2 — numbers below are demo data.",
  yandex:
    "Yandex Direct sync (with RUB→EUR conversion) ships in Phase 2 — numbers below are demo data.",
};

export function PlatformPage({
  platform,
  data,
  location,
}: {
  platform: PlatformKey;
  data: DashboardData;
  location: LocationCode;
}) {
  const meta = PLATFORM_META[platform];
  const k = data.kpis[platform];
  const trend = data.trendByPlatform[platform];
  const campaigns = data.campaigns
    .filter((c) => c.platform === platform)
    .filter((c) => location === "ALL" || c.location === location)
    .sort((a, b) => b.spend - a.spend);

  const note = data.source === "demo" ? PHASE_NOTE[platform] : undefined;

  return (
    <>
      {note && (
        <div className="section">
          <span className="tag-soft">Phase 2 · coming soon</span>
          <div className="card card-pad" style={{ borderLeft: "3px solid var(--primary)" }}>
            <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>{note}</div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard hero label={`${meta.label} ROAS`} value={`${k.roas.toFixed(2)}x`} />
        <KpiCard label="Spend (30d)" value={eur(k.spend)} />
        <KpiCard label="Revenue (30d)" value={eur(k.revenue)} />
        <KpiCard label="Conversions" value={num(k.conversions)} />
        <KpiCard label="CPA" value={eur(k.cpa)} />
        <KpiCard label="CTR" value={`${k.ctr.toFixed(1)}%`} />
      </div>

      <div className="section section-grid grid-2-1">
        <Card title="Spend vs ROAS" sub={`${meta.label} · last 30 days · EUR`}>
          <SpendRoasChart data={trend} />
        </Card>
        <Card title="Conversions" sub="Daily · last 30 days">
          <MiniAreaChart data={trend} dataKey="conversions" color={meta.color} height={280} />
        </Card>
      </div>

      <div className="section">
        <Card
          title={`${meta.label} campaigns`}
          sub={`${campaigns.length} campaigns · sorted by spend`}
        >
          <CampaignTable rows={campaigns} showPlatform={false} />
        </Card>
      </div>
    </>
  );
}
