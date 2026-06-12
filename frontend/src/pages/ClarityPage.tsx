import type { DashboardData } from "../data/types";
import { Card, KpiCard, num } from "../components/ui";

export function ClarityPage({ data }: { data: DashboardData }) {
  const c = data.clarity;

  const frictionScore =
    c.totalSessions > 0
      ? +(
          ((c.deadClickRate / 100) * c.totalSessions +
            (c.rageClickRate / 100) * c.totalSessions) /
          c.totalSessions *
          100
        ).toFixed(1)
      : 0;

  const bounceStatus = c.bounceRate < 40 ? "good" : c.bounceRate < 60 ? "warn" : "bad";
  const deadStatus = c.deadClickRate < 3 ? "good" : c.deadClickRate < 6 ? "warn" : "bad";
  const rageStatus = c.rageClickRate < 1 ? "good" : c.rageClickRate < 2 ? "warn" : "bad";
  const loadStatus = c.avgLoadMs < 3000 ? "good" : c.avgLoadMs < 5000 ? "warn" : "bad";
  const perfStatus = c.performanceScore >= 80 ? "good" : c.performanceScore >= 50 ? "warn" : "bad";

  return (
    <>
      {data.source === "demo" && (
        <div className="section">
          <span className="tag-soft">Phase 4 · friction × ads correlation</span>
          <div className="card card-pad" style={{ borderLeft: "3px solid var(--primary)" }}>
            <div style={{ fontSize: 13, color: "var(--ink-secondary)" }}>
              Microsoft Clarity friction data (dead clicks, rage clicks, bounce
              rate) will sync every 6 hours and correlate with ad performance —
              so you can see when a landing-page problem is wasting ad spend.
              Numbers below reflect the friction analysis from June 2026.
            </div>
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard hero label="Sessions" value={num(c.totalSessions)} />
        <KpiCard label="Users" value={num(c.users ?? 0)} />
        <KpiCard label="Performance Score" value={c.performanceScore ? `${c.performanceScore.toFixed(0)}/100` : "—"} />
        <KpiCard label="Friction Score" value={`${frictionScore.toFixed(1)}%`} />
        <KpiCard
          label="Bounce Rate"
          value={`${c.bounceRate.toFixed(1)}%`}
          delta={{ value: "target 40%", direction: "down", goodWhen: "down" }}
        />
        <KpiCard label="Dead Click Rate" value={`${c.deadClickRate.toFixed(1)}%`} />
        <KpiCard label="Rage Click Rate" value={`${c.rageClickRate.toFixed(1)}%`} />
        <KpiCard label="Avg. Page Load" value={`${(c.avgLoadMs / 1000).toFixed(1)}s`} />
      </div>

      {/* CRO thresholds */}
      <div className="section">
        <Card title="CRO health thresholds" sub="Current vs best-practice targets">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, paddingTop: 8 }}>
            {[
              { label: "Bounce Rate", value: `${c.bounceRate.toFixed(1)}%`, target: "< 40%", status: bounceStatus },
              { label: "Dead Click Rate", value: `${c.deadClickRate.toFixed(1)}%`, target: "< 3%", status: deadStatus },
              { label: "Rage Click Rate", value: `${c.rageClickRate.toFixed(1)}%`, target: "< 1%", status: rageStatus },
              { label: "Avg. Page Load", value: `${(c.avgLoadMs / 1000).toFixed(1)}s`, target: "< 3s", status: loadStatus },
              { label: "Performance Score", value: c.performanceScore ? `${c.performanceScore.toFixed(0)}/100` : "—", target: "≥ 80", status: perfStatus },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, background: "var(--canvas-soft)", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--ink-secondary)", marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{item.value}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-tertiary)" }}>target {item.target}</div>
                </div>
                <span className={`status ${item.status}`} style={{ flexShrink: 0 }}>
                  {item.status === "good" ? "OK" : item.status === "warn" ? "Watch" : "Fix"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="section">
        <Card
          title="Friction by page"
          sub="Dead clicks, rage clicks, and load time per landing page · selected period"
        >
          <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Page</th>
                <th className="num">Sessions</th>
                <th className="num">Dead Clicks</th>
                <th className="num">Rage Clicks</th>
                <th className="num">Bounce</th>
                <th className="num">Load</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {c.pages.map((p) => {
                const deadRate = (p.deadClicks / p.sessions) * 100;
                const health =
                  deadRate > 6 || p.avgLoadMs > 6000
                    ? "bad"
                    : deadRate > 3 || p.avgLoadMs > 4500
                    ? "warn"
                    : "good";
                return (
                  <tr key={p.url}>
                    <td className="row-name">{p.url}</td>
                    <td className="num">{num(p.sessions)}</td>
                    <td className="num">{num(p.deadClicks)}</td>
                    <td className="num">{num(p.rageClicks)}</td>
                    <td className="num">{p.bounceRate.toFixed(1)}%</td>
                    <td className="num">{(p.avgLoadMs / 1000).toFixed(1)}s</td>
                    <td>
                      <span className={`status ${health}`}>
                        {health === "good"
                          ? "Healthy"
                          : health === "warn"
                          ? "Watch"
                          : "Friction"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      </div>

      <div className="section">
        <Card title="Known friction points" sub="From the June 2026 Clarity session-recording analysis">
          <div className="alert-row">
            <span className="status bad alert-sev">P1</span>
            <div className="alert-text">
              Date picker: users click arrows 10+ times instead of opening the
              full calendar (month-click feature is not discoverable)
              <div className="where">/booking/date-select · fix: visible "Open calendar" affordance</div>
            </div>
          </div>
          <div className="alert-row">
            <span className="status bad alert-sev">P2</span>
            <div className="alert-text">
              Dead clicks on room feature icons that look tappable but aren't
              <div className="where">/rooms/saw · fix: tooltips or remove hover affordance</div>
            </div>
          </div>
          <div className="alert-row">
            <span className="status warn alert-sev">P3</span>
            <div className="alert-text">
              Form state lost when navigating back — users re-enter everything
              <div className="where">/checkout · fix: persist form state in sessionStorage</div>
            </div>
          </div>
          <div className="alert-row">
            <span className="status warn alert-sev">P4</span>
            <div className="alert-text">
              Slow page loads (up to 39s observed) causing abandonment
              <div className="where">sitewide · fix: image optimization + caching</div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
