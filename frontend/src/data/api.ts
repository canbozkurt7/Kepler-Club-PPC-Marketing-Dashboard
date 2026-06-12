import { demoData } from "./demo";
import type { DashboardData } from "./types";

/*
 * Live API client.
 * - Served by the FastAPI backend (production): VITE_API_URL is unset and
 *   requests go to the same origin.
 * - The initial load falls back to demo data when the API is unreachable
 *   or the database is empty (backend 404).
 * - Range queries (fetchDashboardRange) are server-side: the backend
 *   recomputes every metric exactly for the requested window. They never
 *   fall back to demo — on failure the caller keeps the current view.
 */

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

export interface ApiRange {
  from: string; // YYYY-MM-DD
  to: string;
}

function endpointUrl(range?: ApiRange, location?: string): string {
  const params = new URLSearchParams();
  if (range) {
    params.set("date_from", range.from);
    params.set("date_to", range.to);
  }
  if (location && location !== "ALL") params.set("location", location);
  const qs = params.toString();
  return `${API_URL}/api/v1/dashboard/full${qs ? `?${qs}` : ""}`;
}

async function fetchLive(range?: ApiRange, location?: string): Promise<DashboardData> {
  const res = await fetch(endpointUrl(range, location), {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as DashboardData;
  return { ...data, source: "live" };
}

/** Initial load: live if possible, demo otherwise. */
export async function fetchDashboard(): Promise<DashboardData> {
  try {
    return await fetchLive();
  } catch {
    return demoData;
  }
}

/**
 * Server-side window query (date range + optional location). Returns null
 * on failure so the caller keeps the previous view instead of flipping to
 * demo data.
 */
export async function fetchDashboardRange(
  range: ApiRange,
  location?: string
): Promise<DashboardData | null> {
  try {
    return await fetchLive(range, location);
  } catch {
    return null;
  }
}
