import type { DashboardData } from "../data/types";
import { Card, KpiCard, num } from "../components/ui";

export function ClarityPage({ data }: { data: DashboardData }) {
  const c = data.clarity;

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
        <KpiCard
          label="Bounce Rate"
          value={`${c.bounceRate.toFixed(1)}%`}
          delta={{ value: "target 40%", direction: "down", goodWhen: "down" }}
        />
        <KpiCard label="Dead Click Rate" value={`${c.deadClickRate.toFixed(1)}%`} />
        <KpiCard label="Rage Click Rate" value={`${c.rageClickRate.toFixed(1)}%`} />
        <KpiCard label="Avg. Page Load" value={`${(c.avgLoadMs / 1000).toFixed(1)}s`} />
      </div>

      <div className="section">
        <Card
          title="Friction by page"
          sub="Dead clicks, rage clicks, and load time per landing page · selected period"
        >
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
