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

const PIE_COLORS = [
  "#4d5fd9",
  "#221c4e",
  "#22c55e",
  "#f59e0b",
  "#10b5b2",
  "#ec4899",
  "#8b5cf6",
  "#94a3b8",
];

const RADIAN = Math.PI / 180;

/** Donut of conversion-value share by campaign (or any name/value series). */
export function ConvValuePie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  // Print the campaign name on every slice wide enough to hold it; slivers
  // (<5%) stay unlabelled and remain legible in the legend on the right.
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
          stroke="var(--canvas, #fff)"
          strokeWidth={2}
          label={renderSliceLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e4",
            boxShadow: "rgba(0,55,112,0.08) 0 8px 24px",
            fontSize: 14,
            fontFamily: "Inter, sans-serif",
          }}
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
          wrapperStyle={{ fontSize: 13, lineHeight: "20px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

const tickStyle = { fontSize: 11, fill: "#837ca2", fontWeight: 300 };

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
            <stop offset="0%" stopColor="#4d5fd9" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#4d5fd9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e4e4e4" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: "#e4e4e4" }}
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
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e4",
            boxShadow: "rgba(0,55,112,0.08) 0 8px 24px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          }}
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
          stroke="#4d5fd9"
          strokeWidth={1.6}
          fill="url(#spendFill)"
        />
        <Line
          yAxisId="roas"
          type="monotone"
          dataKey="roas"
          name="ROAS"
          stroke="#221c4e"
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
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={enriched} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e4e4e4" strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={tickStyle} tickLine={false} axisLine={{ stroke: "#e4e4e4" }} minTickGap={40} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => `₺${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e4", boxShadow: "rgba(0,55,112,0.08) 0 8px 24px", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          labelFormatter={shortDate}
          formatter={(value: number, name: string) => [`₺${value.toLocaleString("tr-TR")}`, name]}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Area type="monotone" dataKey="netRevenue" name="Net Revenue" stroke="#22c55e" strokeWidth={1.6} fill="url(#netFill)" />
        <Line type="monotone" dataKey="revenue" name="Conv. Value" stroke="#4d5fd9" strokeWidth={1.6} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Daily conversions count area chart */
export function ConversionTrendChart({ data, color = "#4d5fd9" }: { data: TrendPoint[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e4e4e4" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={tickStyle} tickLine={false} axisLine={{ stroke: "#e4e4e4" }} minTickGap={40} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e4", boxShadow: "rgba(0,55,112,0.08) 0 8px 24px", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          labelFormatter={shortDate}
          formatter={(value: number) => [value.toLocaleString(), "Conversions"]}
        />
        <Area type="monotone" dataKey="conversions" name="Conversions" stroke={color} strokeWidth={1.6} fill="url(#convFill)" />
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
            <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e4e4e4" strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={tickStyle} tickLine={false} axisLine={{ stroke: "#e4e4e4" }} minTickGap={40} />
        <YAxis yAxisId="imp" tick={tickStyle} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
        <YAxis yAxisId="ctr" orientation="right" tick={tickStyle} tickLine={false} axisLine={false} width={36} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e4", boxShadow: "rgba(0,55,112,0.08) 0 8px 24px", fontSize: 12, fontFamily: "Inter, sans-serif" }}
          labelFormatter={shortDate}
          formatter={(value: number, name: string) => [
            name === "CTR" ? `${value}%` : value.toLocaleString(),
            name,
          ]}
        />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
        <Area yAxisId="imp" type="monotone" dataKey="impressions" name="Impressions" stroke="#94a3b8" strokeWidth={1.6} fill="url(#impFill)" />
        <Line yAxisId="ctr" type="monotone" dataKey="ctr" name="CTR" stroke="#f59e0b" strokeWidth={1.6} dot={false} />
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
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e4e4e4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: "#e4e4e4" }}
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
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e4",
            boxShadow: "rgba(0,55,112,0.08) 0 8px 24px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          }}
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
          strokeWidth={1.6}
          fill={`url(#${id})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
