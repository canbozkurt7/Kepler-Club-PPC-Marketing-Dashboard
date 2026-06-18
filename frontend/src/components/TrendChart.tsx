import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { TrendPoint } from "../data/types";

/* ---- Dark "command center" chart palette ---- */
const AC = "#6e80ff"; // accent
const AC2 = "#8fa0ff";
const POS = "#3fe0a5"; // net revenue / positive
const WARN = "#ffc061"; // CTR
const MUTE = "#9aa0b2"; // impressions / secondary
const GRID = "rgba(255,255,255,0.07)";
const AXIS = "rgba(255,255,255,0.10)";

const PIE_COLORS = [
  AC,
  AC2,
  POS,
  WARN,
  "#5bcbe0",
  "#c58aff",
  "#ff8fb0",
  "#5e6373",
];

const tickStyle = {
  fontSize: 11,
  fill: MUTE,
  fontWeight: 400,
  fontFamily: "'JetBrains Mono', monospace",
};

const tooltipProps = {
  contentStyle: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.13)",
    background: "#15171f",
    boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    color: "#eceef3",
  },
  labelStyle: { color: MUTE, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
  itemStyle: { color: "#eceef3" },
};

const legendStyle = { fontSize: 11, paddingTop: 4, color: MUTE };

const RADIAN = Math.PI / 180;

/** Donut of conversion-value share by campaign (or any name/value series). */
export function ConvValuePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  const renderSliceLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    const short = name.length > 12 ? `${name.slice(0, 11)}…` : name;
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ pointerEvents: "none" }}
      >
        {short}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="42%"
          cy="50%"
          innerRadius={58}
          outerRadius={100}
          paddingAngle={1.5}
          stroke="#101219"
          strokeWidth={2}
          label={renderSliceLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          {...tooltipProps}
          formatter={(value: number, name: string) => [
            `₺${value.toLocaleString("tr-TR")} · ${((value / total) * 100).toFixed(1)}%`,
            name,
          ]}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconSize={11}
          wrapperStyle={{ fontSize: 13, lineHeight: "20px", color: MUTE }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function shortDate(d: string) {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function SpendRoasChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AC} stopOpacity={0.28} />
            <stop offset="100%" stopColor={AC} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: AXIS }}
          minTickGap={36}
        />
        <YAxis
          yAxisId="spend"
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `₺${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          width={52}
        />
        <YAxis
          yAxisId="roas"
          orientation="right"
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}x`}
          width={40}
        />
        <Tooltip
          {...tooltipProps}
          labelFormatter={shortDate}
          formatter={(value: number, name: string) =>
            name === "ROAS"
              ? [`${value.toFixed(2)}x`, name]
              : [`₺${value.toLocaleString("tr-TR")}`, name]
          }
        />
        <Area
          yAxisId="spend"
          type="monotone"
          dataKey="spend"
          name="Spend"
          stroke={AC}
          strokeWidth={2}
          fill="url(#spendFill)"
        />
        <Line
          yAxisId="roas"
          type="monotone"
          dataKey="roas"
          name="ROAS"
          stroke={MUTE}
          strokeWidth={1.6}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Net Revenue (revenue − spend) vs Conversion Value — two lines */
export function NetRevenueChart({ data }: { data: TrendPoint[] }) {
  const enriched = data.map((p) => ({
    ...p,
    netRevenue: Math.round(p.revenue - p.spend),
  }));
  return (
    <ResponsiveContainer width="100%" height={230}>
      <ComposedChart data={enriched} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mainFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AC} stopOpacity={0.28} />
            <stop offset="100%" stopColor={AC} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={tickStyle} tickLine={false} axisLine={{ stroke: AXIS }} minTickGap={40} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `₺${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
        <Tooltip
          {...tooltipProps}
          labelFormatter={shortDate}
          formatter={(value: number, name: string) => [`₺${value.toLocaleString("tr-TR")}`, name]}
        />
        <Legend iconSize={8} wrapperStyle={legendStyle} />
        <Area type="monotone" dataKey="revenue" name="Conv. value" stroke={AC} strokeWidth={2} fill="url(#mainFill)" />
        <Line type="monotone" dataKey="netRevenue" name="Net revenue" stroke={MUTE} strokeWidth={1.4} strokeDasharray="4 3" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Daily conversions count area chart */
export function ConversionTrendChart({ data, color = AC }: { data: TrendPoint[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={tickStyle} tickLine={false} axisLine={{ stroke: AXIS }} minTickGap={40} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          {...tooltipProps}
          labelFormatter={shortDate}
          formatter={(value: number) => [value.toLocaleString(), "Conversions"]}
        />
        <Area type="monotone" dataKey="conversions" name="Conversions" stroke={color} strokeWidth={2} fill="url(#convFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Impressions (left Y, area) + CTR (right Y, line) */
export function CtrImpressionsChart({ data }: { data: TrendPoint[] }) {
  const enriched = data.map((p) => ({
    ...p,
    ctr: p.impressions && p.impressions > 0 ? +((p.clicks ?? 0) / p.impressions * 100).toFixed(2) : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={enriched} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="impFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MUTE} stopOpacity={0.20} />
            <stop offset="100%" stopColor={MUTE} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={tickStyle} tickLine={false} axisLine={{ stroke: AXIS }} minTickGap={40} />
        <YAxis yAxisId="imp" tick={tickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
        <YAxis yAxisId="ctr" orientation="right" tick={tickStyle} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          {...tooltipProps}
          labelFormatter={shortDate}
          formatter={(value: number, name: string) => [
            name === "CTR" ? `${value}%` : value.toLocaleString(),
            name,
          ]}
        />
        <Legend iconSize={8} wrapperStyle={legendStyle} />
        <Area yAxisId="imp" type="monotone" dataKey="impressions" name="Impr." stroke={MUTE} strokeWidth={1.6} fill="url(#impFill)" />
        <Line yAxisId="ctr" type="monotone" dataKey="ctr" name="CTR" stroke={AC} strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MiniAreaChart({
  data,
  dataKey,
  color,
  height = 180,
  prefix = "",
  suffix = "",
}: {
  data: TrendPoint[];
  dataKey: keyof TrendPoint;
  color: string;
  height?: number;
  prefix?: string;
  suffix?: string;
}) {
  const id = `fill-${String(dataKey)}-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: AXIS }}
          minTickGap={36}
        />
        <YAxis
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(v: number) =>
            `${prefix}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}${suffix}`
          }
        />
        <Tooltip
          {...tooltipProps}
          labelFormatter={shortDate}
          formatter={(value: number) => [
            `${prefix}${value.toLocaleString()}${suffix}`,
            String(dataKey),
          ]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${id})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
