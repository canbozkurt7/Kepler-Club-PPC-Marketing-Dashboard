import type { ReactNode } from "react";
import type { AlertItem, CampaignRow, PlatformKey } from "../data/types";

export const PLATFORM_META: Record<
  PlatformKey,
  { label: string; color: string }
> = {
  google: { label: "Google Ads", color: "#4285F4" },
  meta: { label: "Meta Ads", color: "#0081FB" },
  yandex: { label: "Yandex Ads", color: "#FC3F1D" },
};

export const eur = (v: number) =>
  "€" +
  v.toLocaleString("en-IE", {
    maximumFractionDigits: v >= 1000 ? 0 : 2,
  });

export const num = (v: number) => v.toLocaleString("en-IE");

export function KpiCard({
  label,
  value,
  delta,
  hero,
}: {
  label: string;
  value: string;
  delta?: { value: string; direction: "up" | "down"; goodWhen: "up" | "down" };
  hero?: boolean;
}) {
  const isGood = delta ? delta.direction === delta.goodWhen : true;
  return (
    <div className={`card kpi ${hero ? "kpi-hero" : ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value tnum">{value}</div>
      {delta && (
        <span className={`kpi-delta ${isGood ? "up" : "down"}`}>
          {delta.direction === "up" ? "↑" : "↓"} {delta.value} vs prev. period
        </span>
      )}
    </div>
  );
}

export function PlatformChip({ platform }: { platform: PlatformKey }) {
  const m = PLATFORM_META[platform];
  return (
    <span className="chip">
      <span className="tab-dot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function SeverityPill({ severity }: { severity: AlertItem["severity"] }) {
  const cls =
    severity === "CRITICAL" || severity === "HIGH"
      ? "bad"
      : severity === "MEDIUM"
      ? "warn"
      : "good";
  return <span className={`status ${cls} alert-sev`}>{severity}</span>;
}

export function CampaignTable({
  rows,
  showPlatform = true,
}: {
  rows: CampaignRow[];
  showPlatform?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon">∅</div>
        <div className="empty-title">No campaigns for this filter</div>
        <div className="empty-sub">
          Try selecting a different location, or check that the sync has run.
        </div>
      </div>
    );
  }
  return (
    <div className="table-scroll">
    <table className="data">
      <thead>
        <tr>
          <th>Campaign</th>
          {showPlatform && <th>Platform</th>}
          <th>Loc</th>
          <th>Status</th>
          <th className="num">Spend</th>
          <th className="num">Revenue</th>
          <th className="num">ROAS</th>
          <th className="num">Conv.</th>
          <th className="num">CPA</th>
          <th className="num">CTR</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className="row-name">{r.name}</td>
            {showPlatform && (
              <td>
                <PlatformChip platform={r.platform} />
              </td>
            )}
            <td>{r.location}</td>
            <td>
              <span className={`status ${r.status === "ACTIVE" ? "good" : "warn"}`}>
                {r.status === "ACTIVE" ? "Active" : "Paused"}
              </span>
            </td>
            <td className="num">{eur(r.spend)}</td>
            <td className="num">{eur(r.revenue)}</td>
            <td className="num">
              <strong style={{ fontWeight: 500 }}>{r.roas.toFixed(2)}x</strong>
            </td>
            <td className="num">{num(r.conversions)}</td>
            <td className="num">{eur(r.cpa)}</td>
            <td className="num">{r.ctr.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export function Card({
  title,
  sub,
  children,
}: {
  title?: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <div className="card card-pad">
      {title && <div className="card-title">{title}</div>}
      {sub && <div className="card-sub">{sub}</div>}
      {children}
    </div>
  );
}
