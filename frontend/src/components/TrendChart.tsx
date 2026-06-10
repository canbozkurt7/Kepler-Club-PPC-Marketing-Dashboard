import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "../data/types";

const tickStyle = { fontSize: 11, fill: "#64748d", fontWeight: 300 };

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
            <stop offset="0%" stopColor="#533afd" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#533afd" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e3e8ee" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: "#e3e8ee" }}
          minTickGap={36}
        />
        <YAxis
          yAxisId="spend"
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `€${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
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
            border: "1px solid #e3e8ee",
            boxShadow: "rgba(0,55,112,0.08) 0 8px 24px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          }}
          labelFormatter={shortDate}
          formatter={(value: number, name: string) =>
            name === "ROAS"
              ? [`${value.toFixed(2)}x`, name]
              : [`€${value.toLocaleString()}`, name]
          }
        />
        <Area
          yAxisId="spend"
          type="monotone"
          dataKey="spend"
          name="Spend"
          stroke="#533afd"
          strokeWidth={1.6}
          fill="url(#spendFill)"
        />
        <Line
          yAxisId="roas"
          type="monotone"
          dataKey="roas"
          name="ROAS"
          stroke="#ea2261"
          strokeWidth={1.6}
          dot={false}
        />
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
        <CartesianGrid stroke="#e3e8ee" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={tickStyle}
          tickLine={false}
          axisLine={{ stroke: "#e3e8ee" }}
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
            border: "1px solid #e3e8ee",
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
