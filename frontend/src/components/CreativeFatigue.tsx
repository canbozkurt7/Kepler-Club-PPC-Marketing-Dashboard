import { useState } from "react";
import type { LocationCode, MetaCreative } from "../data/types";
import { Card, KpiCard, money, num } from "./ui";

type Fatigue = "FRESH" | "WATCH" | "FATIGUED";

/**
 * Creative fatigue = an audience tiring of an ad. The tell-tale combination is
 * rising frequency (same people see it again and again) + falling CTR + rising
 * CPM. We classify each creative from those signals.
 */
function classify(c: MetaCreative): {
  status: Fatigue;
  ctrDecline: number;
  cpmRise: number;
} {
  const ctrDecline = c.ctrPrev > 0 ? ((c.ctrPrev - c.ctr) / c.ctrPrev) * 100 : 0;
  const cpmRise = c.cpmPrev > 0 ? ((c.cpm - c.cpmPrev) / c.cpmPrev) * 100 : 0;
  let status: Fatigue = "FRESH";
  if (c.frequency >= 3.5 && ctrDecline >= 20) status = "FATIGUED";
  else if (c.frequency >= 2.5 || ctrDecline >= 10) status = "WATCH";
  return { status, ctrDecline, cpmRise };
}

const STATUS_CLASS: Record<Fatigue, string> = {
  FRESH: "good",
  WATCH: "warn",
  FATIGUED: "bad",
};

const STATUS_LABEL: Record<Fatigue, string> = {
  FRESH: "Fresh",
  WATCH: "Watch",
  FATIGUED: "Fatigued",
};

type SortKey = "frequency" | "ctr" | "cpm" | "impressions" | "spend" | "daysRunning";

export function CreativeFatigue({
  rows,
  location,
}: {
  rows: MetaCreative[];
  location: LocationCode;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("frequency");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const scoped = rows.filter(
    (r) => location === "ALL" || r.location === location
  );

  const enriched = scoped.map((c) => ({ ...c, ...classify(c) }));

  const fatigued = enriched.filter((c) => c.status === "FATIGUED");
  const watch = enriched.filter((c) => c.status === "WATCH");
  const spendAtRisk = fatigued.reduce((s, c) => s + c.spend, 0);
  const avgFreq =
    enriched.length > 0
      ? enriched.reduce((s, c) => s + c.frequency, 0) / enriched.length
      : 0;

  const sorted = [...enriched].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const col = (key: SortKey, label: string) => {
    const active = sortKey === key;
    return (
      <th
        className="num"
        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => {
          if (active) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
          else {
            setSortKey(key);
            setSortDir("desc");
          }
        }}
      >
        {label}
        {active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
      </th>
    );
  };

  if (scoped.length === 0) {
    return (
      <Card title="Creative fatigue" sub="Meta ad creatives">
        <div className="empty">
          <div className="empty-icon">∅</div>
          <div className="empty-title">No creative data for this filter</div>
          <div className="empty-sub">
            Ad-level fatigue signals populate once the Meta sync has run.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard
          label="Fatigued creatives"
          value={String(fatigued.length)}
          note={`${watch.length} more on watch`}
        />
        <KpiCard
          label="Spend at risk"
          value={money(spendAtRisk)}
          note="on fatigued creatives"
        />
        <KpiCard
          label="Avg frequency"
          value={avgFreq.toFixed(1)}
          note="impressions per person"
        />
        <KpiCard
          label="Active creatives"
          value={String(enriched.filter((c) => c.status === "FRESH").length)}
          note="still fresh"
        />
      </div>

      <Card
        title="Creative fatigue"
        sub="Rising frequency + falling CTR + rising CPM = an audience tiring of the ad"
      >
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 11,
            color: "var(--ink-mute)",
            marginBottom: 12,
          }}
        >
          <span>
            <span className="status bad">Fatigued</span> freq ≥ 3.5 & CTR down ≥ 20%
          </span>
          <span>
            <span className="status warn">Watch</span> freq ≥ 2.5 or CTR down ≥ 10%
          </span>
          <span>
            <span className="status good">Fresh</span> healthy frequency & CTR
          </span>
        </div>

        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Creative</th>
                <th>Campaign</th>
                <th>Status</th>
                {col("frequency", "Freq.")}
                {col("ctr", "CTR (Δ)")}
                {col("cpm", "CPM (Δ)")}
                {col("impressions", "Impr.")}
                {col("spend", "Spend")}
                {col("daysRunning", "Days")}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id}>
                  <td className="row-name">{c.name}</td>
                  <td style={{ color: "var(--ink-secondary)", fontSize: 12 }}>
                    {c.campaign}
                  </td>
                  <td>
                    <span className={`status ${STATUS_CLASS[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="num">
                    <strong
                      style={{
                        fontWeight: 500,
                        color:
                          c.frequency >= 3.5
                            ? "var(--negative)"
                            : c.frequency >= 2.5
                            ? "var(--warning, #b45309)"
                            : "inherit",
                      }}
                    >
                      {c.frequency.toFixed(1)}
                    </strong>
                  </td>
                  <td className="num">
                    {c.ctr.toFixed(2)}%
                    {c.ctrDecline >= 5 && (
                      <span style={{ color: "var(--negative)", fontSize: 11 }}>
                        {" "}
                        ↓{c.ctrDecline.toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="num">
                    {money(c.cpm)}
                    {c.cpmRise >= 5 && (
                      <span style={{ color: "var(--negative)", fontSize: 11 }}>
                        {" "}
                        ↑{c.cpmRise.toFixed(0)}%
                      </span>
                    )}
                  </td>
                  <td className="num">{num(c.impressions)}</td>
                  <td className="num">{money(c.spend)}</td>
                  <td className="num">{c.daysRunning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
