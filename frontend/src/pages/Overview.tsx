import { useMemo, useState } from "react";
import type { DashboardData, LocationCode, TrendPoint } from "../data/types";
import {
  Card,
  CampaignTable,
  KpiCard,
  PLATFORM_META,
  SeverityPill,
  convValue,
  money,
  num,
} from "../components/ui";
import {
  NetRevenueChart,
  ConversionTrendChart,
  CtrImpressionsChart,
} from "../components/TrendChart";

type Granularity = "daily" | "weekly" | "monthly";

/** Monday of the ISO week containing the given date (UTC math). */
function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function aggregateTrend(points: TrendPoint[], g: Granularity): TrendPoint[] {
  if (g === "daily") return points;
  const buckets = new Map<string, TrendPoint>();
  for (const p of points) {
    const key = g === "weekly" ? weekStart(p.date) : `${p.date.slice(0, 7)}-01`;
    const b = buckets.get(key);
    if (!b) {
      buckets.set(key, { ...p, date: key });
    } else {
      b.spend += p.spend;
      b.revenue += p.revenue;
      b.conversions += p.conversions;
      b.clicks = (b.clicks ?? 0) + (p.clicks ?? 0);
      b.impressions = (b.impressions ?? 0) + (p.impressions ?? 0);
    }
  }
  return [...buckets.keys()].sort().map((k) => {
    const b = buckets.get(k)!;
    return {
      ...b,
      spend: +b.spend.toFixed(2),
      revenue: +b.revenue.toFixed(2),
      roas: b.spend > 0 ? +(b.revenue / b.spend).toFixed(2) : 0,
    };
  });
}

/** Sum several per-campaign daily series into one blended series. */
function mergeTrends(series: TrendPoint[][]): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();
  for (const points of series) {
    for (const p of points) {
      const b = byDate.get(p.date);
      if (!b) {
        byDate.set(p.date, { ...p });
      } else {
        b.spend += p.spend;
        b.revenue += p.revenue;
        b.conversions += p.conversions;
        b.clicks = (b.clicks ?? 0) + (p.clicks ?? 0);
        b.impressions = (b.impressions ?? 0) + (p.impressions ?? 0);
      }
    }
  }
  return [...byDate.keys()].sort().map((k) => {
    const b = byDate.get(k)!;
    return {
      ...b,
      roas: b.spend > 0 ? +(b.revenue / b.spend).toFixed(2) : 0,
    };
  });
}

export function Overview({
  data,
  location,
}: {
  data: DashboardData;
  location: LocationCode;
}) {
  const k = data.kpis.blended;
  // Empty selection = all campaigns blended
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("daily");

  const campaigns = data.campaigns
    .filter((c) => location === "ALL" || c.location === location)
    .sort((a, b) => b.spend - a.spend);

  // Campaign options for the dropdown (filtered by location)
  const campaignOptions = campaigns.map((c) => ({ id: c.id, name: c.name }));

  // Ignore selections that fell out of scope after a location change
  const validIds = selectedIds.filter((id) =>
    campaignOptions.some((c) => c.id === id)
  );

  const activeTrend = useMemo(() => {
    const daily =
      validIds.length === 0
        ? data.trend
        : mergeTrends(
            validIds.map((id) => data.trendByCampaign?.[id] ?? [])
          );
    return aggregateTrend(daily, granularity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, validIds.join(","), granularity]);

  const toggleCampaign = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const dropdownLabel =
    validIds.length === 0
      ? "All campaigns blended"
      : validIds.length === 1
      ? campaignOptions.find((c) => c.id === validIds[0])?.name ?? "1 campaign"
      : `${validIds.length} campaigns selected`;

  const granularityLabel =
    granularity === "daily" ? "Daily" : granularity === "weekly" ? "Weekly" : "Monthly";

  const platforms = (["google", "meta", "yandex"] as const).map((p) => ({
    key: p,
    ...PLATFORM_META[p],
    kpis: data.kpis[p],
  }));

  return (
    <>
      <div className="kpi-grid">
        <KpiCard hero label="Blended ROAS" value={`${k.roas.toFixed(2)}x`} />
        <KpiCard label="Total Spend" value={money(k.spend)} />
        <KpiCard
          label="Conversion Value"
          value={money(convValue(k.spend, k.roas, k.revenue))}
        />
        <KpiCard label="Conversions" value={num(k.conversions)} />
        <KpiCard label="Blended CPA" value={money(k.cpa)} />
      </div>

      {/* Campaign selector + granularity for charts */}
      <div className="section" style={{ paddingBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--ink-secondary)", fontWeight: 500 }}>
            Chart view:
          </span>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              style={{
                fontSize: 12,
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--canvas)",
                color: "var(--ink)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {dropdownLabel}
              <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
            </button>
            {dropdownOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 19 }}
                  onClick={() => setDropdownOpen(false)}
                />
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 20,
                    minWidth: 280,
                    maxHeight: 320,
                    overflowY: "auto",
                    padding: 8,
                    boxShadow: "rgba(0,55,112,0.12) 0 12px 32px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      fontSize: 12,
                      cursor: "pointer",
                      borderRadius: 6,
                      fontWeight: 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={validIds.length === 0}
                      onChange={() => setSelectedIds([])}
                    />
                    All campaigns blended
                  </label>
                  <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
                  {campaignOptions.map((c) => (
                    <label
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        borderRadius: 6,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={validIds.includes(c.id)}
                        onChange={() => toggleCampaign(c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {(["daily", "weekly", "monthly"] as const).map((g) => (
              <button
                key={g}
                className={`pill ${granularity === g ? "active" : ""}`}
                onClick={() => setGranularity(g)}
              >
                {g === "daily" ? "Daily" : g === "weekly" ? "Weekly" : "Monthly"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3-chart grid */}
      <div className="section section-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card title="Net Revenue vs Conv. Value" sub={`${granularityLabel} · TRY`}>
          <NetRevenueChart data={activeTrend} />
        </Card>
        <Card title="Conversions" sub={`${granularityLabel} count`}>
          <ConversionTrendChart data={activeTrend} />
        </Card>
        <Card title="CTR & Impressions" sub="CTR % (right) · Impressions (left)">
          <CtrImpressionsChart data={activeTrend} />
        </Card>
      </div>

      {/* Alerts */}
      <div className="section">
        <Card title="Active alerts" sub="Rule engine · email + dashboard">
          {data.alerts.length === 0 ? (
            <div className="empty" style={{ padding: "24px 8px" }}>
              <div className="empty-title">All clear</div>
              <div className="empty-sub">No alert rules triggered.</div>
            </div>
          ) : (
            data.alerts.map((a) => (
              <div className="alert-row" key={a.id}>
                <SeverityPill severity={a.severity} />
                <div className="alert-text">
                  {a.message}
                  <div className="where">
                    {a.location} · {a.platform} ·{" "}
                    {new Date(a.triggeredAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <div className="section">
        <Card title="Platform breakdown" sub="selected period · TRY">
          <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Platform</th>
                <th className="num">Spend</th>
                <th className="num">Conv. Value</th>
                <th className="num">ROAS</th>
                <th className="num">Conversions</th>
                <th className="num">CPA</th>
                <th className="num">CTR</th>
                <th className="num">CPC</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((p) => (
                <tr key={p.key}>
                  <td>
                    <span className="chip">
                      <span className="tab-dot" style={{ background: p.color }} />
                      {p.label}
                    </span>
                  </td>
                  <td className="num">{money(p.kpis.spend)}</td>
                  <td className="num">
                    {money(convValue(p.kpis.spend, p.kpis.roas, p.kpis.revenue))}
                  </td>
                  <td className="num">
                    <strong style={{ fontWeight: 500 }}>
                      {p.kpis.roas.toFixed(2)}x
                    </strong>
                  </td>
                  <td className="num">{num(p.kpis.conversions)}</td>
                  <td className="num">{money(p.kpis.cpa)}</td>
                  <td className="num">{p.kpis.ctr.toFixed(1)}%</td>
                  <td className="num">{money(p.kpis.cpc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      </div>

      <div className="section loc-grid">
        {data.locations.map((loc) => (
          <div className="card card-pad" key={loc.code}>
            <div className="loc-head">
              <span className="loc-code">{loc.code}</span>
              <span className="loc-city">{loc.city}</span>
            </div>
            <div className="loc-stats">
              <div className="loc-stat">
                <div className="v">{money(loc.spend)}</div>
                <div className="k">Spend</div>
              </div>
              <div className="loc-stat">
                <div className="v">{money(convValue(loc.spend, loc.roas))}</div>
                <div className="k">Conv. Value</div>
              </div>
              <div className="loc-stat">
                <div className="v">{loc.roas.toFixed(1)}x</div>
                <div className="k">ROAS</div>
              </div>
              <div className="loc-stat">
                <div className="v">{num(loc.conversions)}</div>
                <div className="k">Conv.</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section">
        <Card
          title="Top campaigns"
          sub={`${campaigns.length} campaigns · click headers to sort`}
        >
          <CampaignTable rows={campaigns} />
        </Card>
      </div>
    </>
  );
}
