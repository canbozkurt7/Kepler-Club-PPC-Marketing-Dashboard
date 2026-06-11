import type { DateRange } from "../data/derive";

function shiftDays(iso: string, days: number): string {
  // UTC-only math: local-time setDate() shifts a day for UTC+ timezones
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Clamp a preset window start so it never precedes the available data. */
function clampFrom(from: string, min: string): string {
  return from < min ? min : from;
}

const PRESETS = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
];

export function DateRangePicker({
  value,
  min,
  max,
  onChange,
}: {
  value: DateRange;
  min: string;
  max: string;
  onChange: (r: DateRange) => void;
}) {
  const activePreset = PRESETS.find(
    (p) =>
      value.to === max &&
      value.from === clampFrom(shiftDays(max, -(p.days - 1)), min)
  );
  const allActive = value.from === min && value.to === max && !activePreset;

  return (
    <div className="range-box">
      <div className="range-presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            className={`range-preset ${activePreset?.label === p.label ? "active" : ""}`}
            onClick={() =>
              onChange({
                from: clampFrom(shiftDays(max, -(p.days - 1)), min),
                to: max,
              })
            }
          >
            {p.label}
          </button>
        ))}
        <button
          className={`range-preset ${allActive ? "active" : ""}`}
          onClick={() => onChange({ from: min, to: max })}
        >
          All
        </button>
      </div>
      <div className="range-inputs">
        <input
          type="date"
          value={value.from}
          min={min}
          max={value.to}
          onChange={(e) =>
            e.target.value && onChange({ ...value, from: e.target.value })
          }
        />
        <span>→</span>
        <input
          type="date"
          value={value.to}
          min={value.from}
          max={max}
          onChange={(e) =>
            e.target.value && onChange({ ...value, to: e.target.value })
          }
        />
      </div>
    </div>
  );
}
