import { demoData } from "./demo";
import type { DashboardData } from "./types";

/*
 * Tries the live FastAPI backend first (VITE_API_URL, e.g. https://api.keplerclub.com).
 * Until the backend serves the full dashboard payload, any failure falls back
 * to the demo dataset so the UI always renders.
 */

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");

export async function fetchDashboard(): Promise<DashboardData> {
  if (!API_URL) return demoData;

  try {
    const res = await fetch(`${API_URL}/api/v1/dashboard/full`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as DashboardData;
    return { ...data, source: "live" };
  } catch {
    return demoData;
  }
}
