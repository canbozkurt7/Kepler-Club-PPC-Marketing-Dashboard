import { num } from "./ui";

export interface FunnelStep {
  label: string;
  value: number;
}

export interface BookingFunnelProps {
  data: FunnelStep[];
}

/**
 * A single vertical booking funnel. Each step is a trapezoid whose width is
 * proportional to its value; the funnel narrows continuously toward the final
 * step. Step-to-step drop-off is shown as a chip on each divider.
 */
export function BookingFunnel({ data }: BookingFunnelProps) {
  if (!data || data.length === 0) return null;

  const n = data.length;
  const svgWidth = 540;
  const padding = 16;
  const stepHeight = 52;
  const svgHeight = padding * 2 + n * stepHeight;
  const innerW = svgWidth - padding * 2;
  const centerX = svgWidth / 2;

  const topValue = data[0].value || 1;
  const maxVal = Math.max(1, ...data.map((s) => s.value));

  const widthAt = (idx: number) => (data[idx].value / maxVal) * innerW;

  const trapezoidPath = (idx: number) => {
    const y1 = padding + idx * stepHeight;
    const y2 = y1 + stepHeight;
    const topW = widthAt(idx);
    // Continuous funnel: this band's bottom edge matches the next band's top
    // width. The last band tapers inward to give a closing "point".
    const botW = idx < n - 1 ? widthAt(idx + 1) : topW * 0.62;
    return `M ${centerX - topW / 2} ${y1} L ${centerX + topW / 2} ${y1} L ${
      centerX + botW / 2
    } ${y2} L ${centerX - botW / 2} ${y2} Z`;
  };

  return (
    <div style={{ width: "100%", height: "auto" }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{
          width: "100%",
          height: "auto",
          aspectRatio: `${svgWidth}/${svgHeight}`,
        }}
      >
        {data.map((step, idx) => {
          const y = padding + idx * stepHeight;
          const pctOfTop = (step.value / topValue) * 100;
          // Opacity deepens toward the final (conversion) step.
          const op = 0.42 + (idx / Math.max(1, n - 1)) * 0.5;

          // Step-to-step drop-off chip (sits on the divider below this band).
          const dividerY = y + stepHeight;
          let dropoff: number | null = null;
          if (idx < n - 1) {
            dropoff = ((step.value - data[idx + 1].value) / step.value) * 100;
          }

          return (
            <g key={idx}>
              <path
                d={trapezoidPath(idx)}
                fill="var(--ac, #6e80ff)"
                fillOpacity={op}
                stroke="var(--ac, #6e80ff)"
                strokeOpacity={0.35}
                strokeWidth={1}
              />

              {/* Step name */}
              <text
                x={centerX}
                y={y + stepHeight * 0.42}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                style={{ fill: "var(--ink, #f4f6fb)", fontFamily: "var(--sans)" }}
              >
                {step.label}
              </text>

              {/* Value · % of top */}
              <text
                x={centerX}
                y={y + stepHeight * 0.74}
                textAnchor="middle"
                fontSize={11}
                style={{ fill: "var(--ink, #f4f6fb)", fillOpacity: 0.75, fontFamily: "var(--mono)" }}
              >
                {num(step.value)} · {pctOfTop.toFixed(0)}%
              </text>

              {/* Drop-off chip on the divider */}
              {dropoff !== null && (
                <g>
                  <rect
                    x={centerX - 30}
                    y={dividerY - 8}
                    width={60}
                    height={16}
                    rx={8}
                    fill="rgba(8, 10, 18, 0.78)"
                    stroke="var(--line, #232838)"
                    strokeWidth={1}
                  />
                  <text
                    x={centerX}
                    y={dividerY + 3.5}
                    textAnchor="middle"
                    fontSize={9.5}
                    style={{ fill: "var(--mute, #9aa0b2)", fontFamily: "var(--mono)" }}
                  >
                    ↓ {dropoff.toFixed(0)}%
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
