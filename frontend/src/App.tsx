import { useEffect, useRef, useState } from "react";
import type { DashboardData, LocationCode } from "./data/types";
import { fetchDashboard, fetchDashboardRange } from "./data/api";
import { deriveForRange, type DateRange } from "./data/derive";
import { DateRangePicker } from "./components/DateRangePicker";
import { Overview } from "./pages/Overview";
import { PlatformPage } from "./pages/PlatformPage";
import { Ga4Page } from "./pages/Ga4Page";
import { ClarityPage } from "./pages/ClarityPage";

type TabKey = "overview" | "google" | "meta" | "yandex" | "ga4" | "clarity";

const TABS: { key: TabKey; label: string; dot?: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "google", label: "Google Ads", dot: "#4285F4" },
  { key: "meta", label: "Meta Ads", dot: "#0081FB" },
  { key: "yandex", label: "Yandex Ads", dot: "#FC3F1D" },
  { key: "ga4", label: "GA4", dot: "#F9AB00" },
  { key: "clarity", label: "Clarity", dot: "#10b5b2" },
];

const LOCATIONS: LocationCode[] = ["ALL", "SAW", "KLIA", "RIX"];

const PAGE_TITLES: Record<TabKey, { title: string; sub: string }> = {
  overview: {
    title: "Performance Overview",
    sub: "Blended view across Google, Meta and Yandex · last 30 days",
  },
  google: { title: "Google Ads", sub: "Search, PMax and display campaigns" },
  meta: { title: "Meta Ads", sub: "Facebook and Instagram campaigns" },
  yandex: { title: "Yandex Ads", sub: "Yandex Direct campaigns · RUB converted to TRY" },
  ga4: { title: "Google Analytics 4", sub: "Site traffic, engagement and conversions" },
  clarity: { title: "Microsoft Clarity", sub: "UX friction signals correlated with ad spend" },
};

export default function App() {
  const [tab, setTab] = useState<TabKey>("overview");
  const [location, setLocation] = useState<LocationCode>("ALL");
  // baseData: the initial full-history payload (source of truth for picker bounds)
  // viewData: what is currently displayed (re-fetched from the backend per range)
  const [baseData, setBaseData] = useState<DashboardData | null>(null);
  const [viewData, setViewData] = useState<DashboardData | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const [updating, setUpdating] = useState(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    fetchDashboard().then((d) => {
      setBaseData(d);
      setViewData(d);
      if (d.trend.length > 0) {
        setRange({
          from: d.trend[0].date,
          to: d.trend[d.trend.length - 1].date,
        });
      }
    });
  }, []);

  // Server-side recompute for the exact window (date range + location).
  // Latest-wins guard prevents a slow older response from overwriting a
  // newer selection.
  const refetchView = (r: DateRange, loc: LocationCode) => {
    if (!baseData) return;

    if (baseData.source === "demo") {
      // No backend available — filter the demo dataset client-side
      setViewData(deriveForRange(baseData, r));
      return;
    }

    const seq = ++requestSeq.current;
    setUpdating(true);
    fetchDashboardRange(r, loc).then((d) => {
      if (seq !== requestSeq.current) return;
      if (d) setViewData(d);
      setUpdating(false);
    });
  };

  const handleRangeChange = (r: DateRange) => {
    setRange(r);
    refetchView(r, location);
  };

  const handleLocationChange = (loc: LocationCode) => {
    setLocation(loc);
    if (range) refetchView(range, loc);
  };

  if (!baseData || !viewData || !range) {
    return (
      <div className="shell">
        <div className="mesh" />
        <div className="empty" style={{ paddingTop: 120 }}>
          <div className="empty-title">Loading dashboard…</div>
        </div>
      </div>
    );
  }

  const { title, sub } = PAGE_TITLES[tab];
  const showLocationFilter = tab !== "ga4" && tab !== "clarity";
  // Picker bounds: prefer the backend-reported full data span; fall back to
  // the initial payload's trend span (demo mode).
  const minDate =
    baseData.dataBounds?.min ?? baseData.trend[0]?.date ?? range.from;
  const maxDate =
    baseData.dataBounds?.max ??
    baseData.trend[baseData.trend.length - 1]?.date ??
    range.to;

  return (
    <div className="shell">
      <div className="mesh" />
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">K</div>
          <div className="brand-name">
            Kepler Club <span>· PPC Command Center</span>
          </div>
        </div>
        <span className="source-chip">
          <span className={`dot ${viewData.source === "live" ? "live" : "demo"}`} />
          {updating
            ? "Updating…"
            : `${viewData.source === "live" ? "Live data" : "Demo data"} · updated ${new Date(
                viewData.updatedAt
              ).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}`}
        </span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.dot && <span className="tab-dot" style={{ background: t.dot }} />}
            {t.label}
          </button>
        ))}
      </nav>

      <main className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">{title}</h1>
            <div className="page-sub">{sub}</div>
          </div>
          <div className="filters-col">
            <DateRangePicker
              value={range}
              min={minDate}
              max={maxDate}
              onChange={handleRangeChange}
            />
            {showLocationFilter && (
              <div className="filters">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    className={`pill ${location === loc ? "active" : ""}`}
                    onClick={() => handleLocationChange(loc)}
                  >
                    {loc === "ALL" ? "All locations" : loc}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ opacity: updating ? 0.55 : 1, transition: "opacity 0.15s" }}>
          {tab === "overview" && <Overview data={viewData} location={location} />}
          {tab === "google" && (
            <PlatformPage platform="google" data={viewData} location={location} />
          )}
          {tab === "meta" && (
            <PlatformPage platform="meta" data={viewData} location={location} />
          )}
          {tab === "yandex" && (
            <PlatformPage platform="yandex" data={viewData} location={location} />
          )}
          {tab === "ga4" && <Ga4Page data={viewData} />}
          {tab === "clarity" && <ClarityPage data={viewData} />}
        </div>
      </main>
    </div>
  );
}
