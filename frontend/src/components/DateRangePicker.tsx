import type { DateRange } from "../data/derive";

function shiftDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
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
    (p) => value.to === max && value.from === shiftDays(max, -(p.days - 1))
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
              onChange({ from: shiftDays(max, -(p.days - 1)), to: max })
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
