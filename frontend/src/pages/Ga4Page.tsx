import type { DashboardData } from "../data/types";
import { Card, KpiCard, num, money } from "../components/ui";

export function Ga4Page({ data }: { data: DashboardData }) {
  const g = data.ga4;
  const maxSessions = Math.max(1, ...g.topChannels.map((c) => c.sessions));

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <>
      {/* KPI row */}
      <div className="kpi-grid">
        <KpiCard hero label="Sessions" value={num(g.sessions)} />
        <KpiCard label="Engaged Sessions" value={num(g.engagedSessions)} />
        <KpiCard label="Engagement Rate" value={`${g.engagementRate.toFixed(1)}%`} />
        <KpiCard label="Avg. Session" value={fmtDuration(g.avgSessionSec)} />
        <KpiCard label="Conversions" value={num(g.conversions)} />
        <KpiCard label="Revenue" value={money(g.revenue)} />
      </div>

      {/* Channels + Devices side by side */}
      <div className="section section-grid grid-2-1">
        <Card title="Sessions by channel" sub="Default channel grouping · selected period">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th style={{ width: "30%" }}></th>
                  <th className="num">Sessions</th>
                  <th className="num">Conversions</th>
                  <th className="num">Revenue</th>
                  <th className="num">CVR</th>
                </tr>
              </thead>
              <tbody>
                {g.topChannels.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--ink-secondary)", padding: "24px 0" }}>No channel data</td></tr>
                ) : g.topChannels.map((c) => (
                  <tr key={c.channel}>
                    <td className="row-name">{c.channel}</td>
                    <td>
                      <div style={{ height: 8, borderRadius: 999, background: "var(--canvas-soft)", overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${(c.sessions / maxSessions) * 100}%`,
                          borderRadius: 999,
                          background: "linear-gradient(90deg, var(--primary) 0%, var(--primary-soft) 100%)",
                        }} />
                      </div>
                    </td>
                    <td className="num">{num(c.sessions)}</td>
                    <td className="num">{num(c.conversions)}</td>
                    <td className="num">{money(c.revenue)}</td>
                    <td className="num">{c.sessions > 0 ? ((c.conversions / c.sessions) * 100).toFixed(2) : "0.00"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Device breakdown" sub="Sessions by device type">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Device</th>
                  <th className="num">Sessions</th>
                  <th className="num">Conv.</th>
                  <th className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {g.devices.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-secondary)", padding: "24px 0" }}>No device data</td></tr>
                ) : g.devices.map((d) => (
                  <tr key={d.device}>
                    <td className="row-name" style={{ textTransform: "capitalize" }}>{d.device}</td>
                    <td className="num">{num(d.sessions)}</td>
                    <td className="num">{num(d.conversions)}</td>
                    <td className="num">{money(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Countries + Pages side by side */}
      <div className="section section-grid grid-2-1">
        <Card title="Top pages" sub="By sessions · selected period">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Page</th>
                  <th className="num">Sessions</th>
                  <th className="num">Conv.</th>
                  <th className="num">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {g.pages.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--ink-secondary)", padding: "24px 0" }}>No page data</td></tr>
                ) : g.pages.map((p) => (
                  <tr key={p.title}>
                    <td className="row-name">{p.title}</td>
                    <td className="num">{num(p.sessions)}</td>
                    <td className="num">{num(p.conversions)}</td>
                    <td className="num">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Top countries" sub="Sessions by country">
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Country</th>
                  <th className="num">Sessions</th>
                  <th className="num">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {g.countries.length === 0 ? (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--ink-secondary)", padding: "24px 0" }}>No country data</td></tr>
                ) : g.countries.map((c) => (
                  <tr key={c.country}>
                    <td className="row-name">{c.country}</td>
                    <td className="num">{num(c.sessions)}</td>
                    <td className="num">{num(c.conversions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
