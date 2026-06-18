import { useId, useState, type ReactNode } from "react";

type CompPeriod = "none" | "7d" | "14d" | "30d";
import type { AlertItem, CampaignRow, PlatformKey } from "../data/types";

export const PLATFORM_META: Record<
  PlatformKey,
  { label: string; color: string }
> = {
  google: { label: "Google Ads", color: "#4285F4" },
  meta: { label: "Meta Ads", color: "#1B3A6B" },
  yandex: { label: "Yandex Ads", color: "#FC3F1D" },
  microsoft: { label: "Microsoft Ads", color: "#00A4EF" },
};

export const money = (v: number) =>
  "₺" +
  v.toLocaleString("tr-TR", {
    maximumFractionDigits: v >= 1000 ? 0 : 2,
  });

// Kept as alias so existing call sites keep working
export const eur = money;

export const num = (v: number) => v.toLocaleString("tr-TR");

/**
 * Conversion value. Google Ads sometimes reports no conversion value even
 * when ROAS is known — per business rule, value = cost × ROAS, always
 * scoped to the same unit (campaign/location/platform) as the inputs.
 */
export const convValue = (spend: number, roas: number, revenue?: number) =>
  revenue && revenue > 0 ? revenue : spend * roas;

export type KpiDelta = {
  value: string;
  direction: "up" | "down";
  goodWhen: "up" | "down" | "neutral";
};

/**
 * Self-baseline delta: current vs the same metric in the prior equal-length
 * window. `goodWhen` drives the colour (e.g. ROAS up = green, CPA up = red,
 * spend = neutral grey). Returns undefined when there's no baseline.
 */
export function kpiDelta(
  curr: number,
  prev: number | undefined,
  goodWhen: "up" | "down" | "neutral"
): KpiDelta | undefined {
  if (prev === undefined || prev === 0 || !isFinite(prev)) return undefined;
  const pct = ((curr - prev) / prev) * 100;
  if (!isFinite(pct)) return undefined;
  return {
    value: `${Math.abs(pct).toFixed(1)}%`,
    direction: pct >= 0 ? "up" : "down",
    goodWhen,
  };
}

/**
 * Lightweight inline-SVG sparkline (no recharts) — matches the design's
 * hand-drawn KPI trend lines. Renders a normalised polyline, optionally
 * filled, into a 120×40 viewBox stretched to the card width.
 */
export function Sparkline({
  values,
  compare,
  color = "var(--ac)",
  area = false,
  height = 40,
  opacity = 1,
}: {
  values: number[];
  compare?: number[];
  color?: string;
  area?: boolean;
  height?: number;
  opacity?: number;
}) {
  const rawId = useId();
  if (!values || values.length < 2) return null;
  const w = 120;
  const h = 40;
  const p = 5;
  // Shared min/max across both series so they render on the same scale
  const allVals = compare ? [...values, ...compare] : values;
  let mn = Infinity;
  let mx = -Infinity;
  for (const v of allVals) {
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  const rng = mx - mn || 1;
  const toPath = (arr: number[]) => {
    const n = arr.length;
    const pts = arr.map((v, i) => {
      const x = (i / (n - 1)) * w;
      const y = h - p - ((v - mn) / rng) * (h - 2 * p);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return pts.map((pt, i) => `${i ? "L" : "M"}${pt}`).join(" ");
  };
  const line = toPath(values);
  const areaPath = `${line} L ${w} ${h} L 0 ${h} Z`;
  const compareLine = compare && compare.length >= 2 ? toPath(compare) : null;
  const gid = `spk-${rawId.replace(/:/g, "")}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      {area && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.4} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {area && <path d={areaPath} fill={`url(#${gid})`} />}
      {compareLine && (
        <path
          d={compareLine}
          fill="none"
          stroke="var(--ink-tertiary, #5e6373)"
          strokeWidth={1.2}
          strokeDasharray="4 3"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeOpacity={opacity}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  hero,
  note,
  spark,
  sparkFull,
  sparkArea,
  sparkAgg = "avg",
}: {
  label: string;
  value: string;
  delta?: KpiDelta;
  hero?: boolean;
  note?: string;
  spark?: number[];
  sparkFull?: number[];
  sparkArea?: boolean;
  sparkAgg?: "avg" | "sum";
}) {
  const [compPeriod, setCompPeriod] = useState<CompPeriod>("none");

  const tone = !delta
    ? ""
    : delta.goodWhen === "neutral"
    ? "neutral"
    : delta.direction === delta.goodWhen
    ? "up"
    : "down";

  const displaySpark = sparkFull ?? spark;
  const hasSpark = !!(displaySpark && displaySpark.length > 1);

  // Comparison slices derived from sparkFull
  const N = compPeriod === "7d" ? 7 : compPeriod === "14d" ? 14 : compPeriod === "30d" ? 30 : 0;
  const currentSlice = sparkFull && N > 0 ? sparkFull.slice(-N) : undefined;
  const prevSlice = sparkFull && N > 0 ? sparkFull.slice(-(N * 2), -N) : undefined;
  const hasComparison = !!(currentSlice && prevSlice && currentSlice.length === N && prevSlice.length === N);

  const agg = (arr: number[]) =>
    sparkAgg === "sum"
      ? arr.reduce((s, v) => s + v, 0)
      : arr.reduce((s, v) => s + v, 0) / arr.length;

  let compDeltaPct: number | null = null;
  if (hasComparison && currentSlice && prevSlice) {
    const cur = agg(currentSlice);
    const prv = agg(prevSlice);
    if (prv !== 0) compDeltaPct = ((cur - prv) / Math.abs(prv)) * 100;
  }

  const sparkValues = hasComparison ? currentSlice! : (displaySpark ?? []);
  const sparkCompare = hasComparison ? prevSlice! : undefined;

  return (
    <div
      className={`card kpi ${hero ? "kpi-hero" : ""} ${hasSpark ? "kpi-spark" : ""}`}
    >
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value tnum">{value}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginTop: hero ? 11 : 9,
            flexWrap: "wrap",
          }}
        >
          {delta && (
            <span className={`kpi-delta ${tone}`} style={{ marginTop: 0 }}>
              {delta.direction === "up" ? "▲" : "▼"} {delta.value}
            </span>
          )}
          {hero && note && (
            <span className="kpi-note" style={{ marginTop: 0 }}>
              {note}
            </span>
          )}
        </div>
        {!hero && note && <div className="kpi-note">{note}</div>}
      </div>
      {hasSpark && (
        <div className="kpi-spark-wrap">
          <Sparkline
            values={sparkValues}
            compare={sparkCompare}
            area={sparkArea}
            opacity={hero ? 1 : 0.7}
            height={hero ? 46 : 36}
          />
        </div>
      )}
      {compDeltaPct !== null && (
        <div className={`kpi-comp-delta ${compDeltaPct >= 0 ? "pos" : "neg"}`}>
          {compDeltaPct >= 0 ? "▲" : "▼"} {Math.abs(compDeltaPct).toFixed(1)}% vs prev {compPeriod}
        </div>
      )}
      {sparkFull && (
        <div className="kpi-comp-row">
          {(["none", "7d", "14d", "30d"] as const).map((p) => (
            <button
              key={p}
              className={`kpi-comp-pill${compPeriod === p ? " active" : ""}`}
              onClick={() => setCompPeriod(p)}
            >
              {p === "none" ? "—" : p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Horizontal "value by campaign" bars — the dark-design replacement for the
 * donut. Each row is a label + figure with a proportional accent bar.
 */
export function ValueByCampaignBars({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
      {data.map((d) => {
        const pct = Math.max((d.value / max) * 100, 2);
        const isOthers = d.name.startsWith("Others");
        return (
          <div key={d.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 5,
              }}
            >
              <span style={{ color: isOthers ? "var(--ink-secondary)" : "var(--ink)" }}>
                {d.name}
              </span>
              <span className="tnum" style={{ color: "var(--ink-secondary)" }}>
                {money(d.value)}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "rgba(255,255,255,0.05)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  borderRadius: 3,
                  background: isOthers
                    ? "var(--line2)"
                    : "linear-gradient(90deg, var(--ac), var(--ac2))",
                }}
              />
            </div>
          </div>
        );
      })}
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

type SortKey = "spend" | "revenue" | "roas" | "conversions" | "cpa" | "ctr" | "clicks" | "impressions";

export function CampaignTable({
  rows,
  showPlatform = true,
}: {
  rows: CampaignRow[];
  showPlatform?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

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

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "desc" ? (bv as number) - (av as number) : (av as number) - (bv as number);
  });

  const col = (key: SortKey, label: string) => {
    const active = sortKey === key;
    return (
      <th
        className="num"
        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => {
          if (active) setSortDir(d => d === "desc" ? "asc" : "desc");
          else { setSortKey(key); setSortDir("desc"); }
        }}
      >
        {label}{active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
      </th>
    );
  };

  return (
    <div className="table-scroll">
    <table className="data">
      <thead>
        <tr>
          <th>Campaign</th>
          {showPlatform && <th>Platform</th>}
          <th>Loc</th>
          <th>Status</th>
          {col("spend", "Spend")}
          {col("revenue", "Conv. Value")}
          {col("roas", "ROAS")}
          {col("conversions", "Conv.")}
          {col("cpa", "CPA")}
          {col("ctr", "CTR")}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
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
            <td className="num">{money(r.spend)}</td>
            <td className="num">{money(convValue(r.spend, r.roas, r.revenue))}</td>
            <td className="num">
              <strong style={{ fontWeight: 500 }}>{r.roas.toFixed(2)}x</strong>
            </td>
            <td className="num">{num(r.conversions)}</td>
            <td className="num">{money(r.cpa)}</td>
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
