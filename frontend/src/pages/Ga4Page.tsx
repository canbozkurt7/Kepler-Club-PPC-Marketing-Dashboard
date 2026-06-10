import type { DashboardData } from "../data/types";
import { Card, KpiCard, num } from "../components/ui";

export function Ga4Page({ data }: { data: DashboardData }) {
  const g = data.ga4;
  const maxSessions = Math.max(...g.topChannels.map((c) => c.sessions));

  return (
    <>
      {data.source === "demo" && (
        <div className="section">
          <span className="tag-soft">Phase 4 · integration planned</span>
          <div className="card card-pad" style={{ borderLeft: "3px solid var(--primary)" }}>
            <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
              GA4 connects via the Google Analytics Data API. Numbers below are
              demo data showing the planned layout.
            </div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard hero label="Sessions (30d)" value={num(g.sessions)} />
        <KpiCard label="Engaged Sessions" value={num(g.engagedSessions)} />
        <KpiCard label="Engagement Rate" value={`${g.engagementRate.toFixed(1)}%`} />
        <KpiCard
          label="Avg. Session"
          value={`${Math.floor(g.avgSessionSec / 60)}m ${g.avgSessionSec % 60}s`}
        />
        <KpiCard label="Conversions" value={num(g.conversions)} />
      </div>

      <div className="section">
        <Card title="Sessions by channel" sub="Default channel grouping · last 30 days">
          <table className="data">
            <thead>
              <tr>
                <th>Channel</th>
                <th style={{ width: "40%" }}></th>
                <th className="num">Sessions</th>
                <th className="num">Conversions</th>
                <th className="num">CVR</th>
              </tr>
            </thead>
            <tbody>
              {g.topChannels.map((c) => (
                <tr key={c.channel}>
                  <td className="row-name">{c.channel}</td>
                  <td>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        background: "var(--canvas-soft)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${(c.sessions / maxSessions) * 100}%`,
                          borderRadius: 999,
                          background:
                            "linear-gradient(90deg, var(--primary) 0%, var(--primary-soft) 100%)",
                        }}
                      />
                    </div>
                  </td>
                  <td className="num">{num(c.sessions)}</td>
                  <td className="num">{num(c.conversions)}</td>
                  <td className="num">
                    {((c.conversions / c.sessions) * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
