import type { DashboardData, LocationCode } from "../data/types";
import {
  Card,
  CampaignTable,
  KpiCard,
  PLATFORM_META,
  SeverityPill,
  eur,
  num,
} from "../components/ui";
import { SpendRoasChart } from "../components/TrendChart";

export function Overview({
  data,
  location,
}: {
  data: DashboardData;
  location: LocationCode;
}) {
  const k = data.kpis.blended;
  const campaigns = data.campaigns
    .filter((c) => location === "ALL" || c.location === location)
    .sort((a, b) => b.spend - a.spend);

  const platforms = (["google", "meta", "yandex"] as const).map((p) => ({
    key: p,
    ...PLATFORM_META[p],
    kpis: data.kpis[p],
  }));

  return (
    <>
      <div className="kpi-grid">
        <KpiCard
          hero
          label="Blended ROAS"
          value={`${k.roas.toFixed(2)}x`}
          delta={{ value: "4.2%", direction: "up", goodWhen: "up" }}
        />
        <KpiCard
          label="Total Spend (30d)"
          value={eur(k.spend)}
          delta={{ value: "2.1%", direction: "up", goodWhen: "down" }}
        />
        <KpiCard
          label="Revenue (30d)"
          value={eur(k.revenue)}
          delta={{ value: "6.8%", direction: "up", goodWhen: "up" }}
        />
        <KpiCard
          label="Conversions"
          value={num(k.conversions)}
          delta={{ value: "3.4%", direction: "up", goodWhen: "up" }}
        />
        <KpiCard
          label="Blended CPA"
          value={eur(k.cpa)}
          delta={{ value: "1.9%", direction: "down", goodWhen: "down" }}
        />
      </div>

      <div className="section section-grid grid-2-1">
        <Card
          title="Spend vs ROAS"
          sub="All platforms blended · last 30 days · EUR"
        >
          <SpendRoasChart data={data.trend} />
        </Card>

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
        <Card title="Platform breakdown" sub="Last 30 days · EUR">
          <table className="data">
            <thead>
              <tr>
                <th>Platform</th>
                <th className="num">Spend</th>
                <th className="num">Revenue</th>
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
                  <td className="num">{eur(p.kpis.spend)}</td>
                  <td className="num">{eur(p.kpis.revenue)}</td>
                  <td className="num">
                    <strong style={{ fontWeight: 500 }}>
                      {p.kpis.roas.toFixed(2)}x
                    </strong>
                  </td>
                  <td className="num">{num(p.kpis.conversions)}</td>
                  <td className="num">{eur(p.kpis.cpa)}</td>
                  <td className="num">{p.kpis.ctr.toFixed(1)}%</td>
                  <td className="num">{eur(p.kpis.cpc)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <div className="v">{eur(loc.spend)}</div>
                <div className="k">Spend</div>
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
          sub={`${campaigns.length} campaigns · sorted by spend`}
        >
          <CampaignTable rows={campaigns} />
        </Card>
      </div>
    </>
  );
}
