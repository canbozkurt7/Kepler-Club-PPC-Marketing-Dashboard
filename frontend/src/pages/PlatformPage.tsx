import type { DashboardData, LocationCode, PlatformKey } from "../data/types";
import {
  Card,
  CampaignTable,
  KpiCard,
  PLATFORM_META,
  convValue,
  kpiDelta,
  money,
  num,
} from "../components/ui";
import { MiniAreaChart, SpendRoasChart } from "../components/TrendChart";
import { INDUSTRY_BENCHMARKS, BENCHMARKS_AS_OF } from "../data/benchmarks";
import { KeywordTable } from "../components/KeywordTable";
import { CreativeFatigue } from "../components/CreativeFatigue";
import { demoData } from "../data/demo";

const PHASE_NOTE: Partial<Record<PlatformKey, string>> = {
  yandex:
    "Yandex Direct sync is wired — live numbers appear once the API token is set on the server. Showing demo data for now.",
  microsoft:
    "Microsoft Advertising (Bing) is not connected to a live data source yet — numbers below are demo data.",
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
  // Microsoft Ads has no live data source yet — always render the demo slice
  // as a clearly-labelled placeholder so the page looks populated like the
  // other platforms instead of showing zeros on the live dashboard.
  const src = platform === "microsoft" ? demoData : data;
  const k = src.kpis[platform];
  const prev = src.previousKpis?.[platform];
  const convNow = convValue(k.spend, k.roas, k.revenue);
  const convPrev = prev ? convValue(prev.spend, prev.roas, prev.revenue) : undefined;
  const bench = INDUSTRY_BENCHMARKS[platform];
  const trend = src.trendByPlatform[platform];
  const campaigns = src.campaigns
    .filter((c) => c.platform === platform)
    .filter((c) => location === "ALL" || c.location === location)
    .sort((a, b) => b.spend - a.spend);

  const note =
    platform === "microsoft" || data.source === "demo"
      ? PHASE_NOTE[platform]
      : undefined;

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
        <KpiCard
          hero
          label={`${meta.label} ROAS`}
          value={`${k.roas.toFixed(2)}x`}
          delta={kpiDelta(k.roas, prev?.roas, "up")}
          note={`Industry median ~${bench.roas}x · ${BENCHMARKS_AS_OF}`}
        />
        <KpiCard
          label="Spend"
          value={money(k.spend)}
          delta={kpiDelta(k.spend, prev?.spend, "neutral")}
        />
        <KpiCard
          label="Conversion Value"
          value={money(convNow)}
          delta={kpiDelta(convNow, convPrev, "up")}
        />
        <KpiCard
          label="Conversions"
          value={num(k.conversions)}
          delta={kpiDelta(k.conversions, prev?.conversions, "up")}
        />
        <KpiCard
          label="CPA"
          value={money(k.cpa)}
          delta={kpiDelta(k.cpa, prev?.cpa, "down")}
        />
        <KpiCard
          label="CTR"
          value={`${k.ctr.toFixed(1)}%`}
          delta={kpiDelta(k.ctr, prev?.ctr, "up")}
          note={`Industry median ~${bench.ctr}%`}
        />
      </div>

      <div className="section section-grid grid-2-1">
        <Card title="Spend vs ROAS" sub={`${meta.label} · selected period · TRY`}>
          <SpendRoasChart data={trend} />
        </Card>
        <Card title="Conversions" sub="Daily · selected period">
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

      {(platform === "google" || platform === "microsoft") && (
        <div className="section">
          <KeywordTable
            rows={
              (platform === "google"
                ? data.googleKeywords
                : src.microsoftKeywords) ?? []
            }
            location={location}
          />
        </div>
      )}

      {platform === "meta" && (
        <div className="section">
          <CreativeFatigue rows={data.metaCreatives ?? []} location={location} />
        </div>
      )}
    </>
  );
}
