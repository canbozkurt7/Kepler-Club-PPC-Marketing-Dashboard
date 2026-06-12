import { useState } from "react";
import type { DashboardData, LocationCode } from "../data/types";
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

export function Overview({
  data,
  location,
}: {
  data: DashboardData;
  location: LocationCode;
}) {
  const k = data.kpis.blended;
  const [selectedCampaign, setSelectedCampaign] = useState<string>("ALL");

  const campaigns = data.campaigns
    .filter((c) => location === "ALL" || c.location === location)
    .sort((a, b) => b.spend - a.spend);

  // Campaign options for the dropdown (filtered by location)
  const campaignOptions = campaigns.map((c) => ({ id: c.id, name: c.name }));

  // Active trend: blended if ALL selected, per-campaign otherwise
  const activeTrend =
    selectedCampaign === "ALL"
      ? data.trend
      : (data.trendByCampaign?.[selectedCampaign] ?? data.trend);

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

      {/* Campaign selector for charts */}
      <div className="section" style={{ paddingBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-secondary)", fontWeight: 500 }}>
            Chart view:
          </span>
          <select
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            style={{
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--canvas)",
              color: "var(--ink)",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All campaigns blended</option>
            {campaignOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-chart grid */}
      <div className="section section-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card title="Net Revenue vs Conv. Value" sub="Daily · TRY">
          <NetRevenueChart data={activeTrend} />
        </Card>
        <Card title="Conversions" sub="Daily count">
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
