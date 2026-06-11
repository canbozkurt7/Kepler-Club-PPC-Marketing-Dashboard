import { demoData } from "./demo";
import type { DashboardData } from "./types";

/*
 * Fetches the live dashboard payload.
 * - When the app is served by the FastAPI backend (production on the VPS),
 *   VITE_API_URL is unset and the fetch goes to the same origin.
 * - VITE_API_URL can point at a remote API for split deployments.
 * - Any failure (backend down, no data synced yet, local dev without a
 *   backend) falls back to the demo dataset so the UI always renders.
 */

const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/$/, "");

export async function fetchDashboard(): Promise<DashboardData> {
  try {
    const res = await fetch(`${API_URL}/api/v1/dashboard/full`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as DashboardData;
    return { ...data, source: "live" };
  } catch {
    return demoData;
  }
}
