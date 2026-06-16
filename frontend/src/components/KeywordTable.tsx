import { useState } from "react";
import type { KeywordRow, LocationCode } from "../data/types";
import { Card, money, num } from "./ui";

type SortKey =
  | "impressions"
  | "clicks"
  | "ctr"
  | "conversions"
  | "spend"
  | "cpa"
  | "roas"
  | "qualityScore";

const MATCH_LABEL: Record<KeywordRow["matchType"], string> = {
  EXACT: "Exact",
  PHRASE: "Phrase",
  BROAD: "Broad",
};

/** Top Google Ads search keywords with sortable performance columns. */
export function KeywordTable({
  rows,
  location,
}: {
  rows: KeywordRow[];
  location: LocationCode;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const scoped = rows.filter(
    (r) => location === "ALL" || r.location === location
  );

  const sorted = [...scoped].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  const col = (key: SortKey, label: string) => {
    const active = sortKey === key;
    return (
      <th
        className="num"
        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => {
          if (active) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
          else {
            setSortKey(key);
            setSortDir("desc");
          }
        }}
      >
        {label}
        {active ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
      </th>
    );
  };

  return (
    <Card
      title="Search keywords"
      sub={`${scoped.length} keywords · Google Ads · click headers to sort`}
    >
      {scoped.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">∅</div>
          <div className="empty-title">No keyword data for this filter</div>
          <div className="empty-sub">
            Keyword-level sync populates this once the Google Ads job has run.
          </div>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Match</th>
                <th>Campaign</th>
                {col("impressions", "Impr.")}
                {col("ctr", "CTR")}
                {col("conversions", "Conv.")}
                {col("spend", "Spend")}
                {col("cpa", "CPA")}
                {col("roas", "ROAS")}
                {col("qualityScore", "QS")}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={`${r.keyword}-${i}`}>
                  <td className="row-name">{r.keyword}</td>
                  <td>
                    <span className="tag-soft">{MATCH_LABEL[r.matchType]}</span>
                  </td>
                  <td style={{ color: "var(--ink-secondary)", fontSize: 12 }}>
                    {r.campaign}
                  </td>
                  <td className="num">{num(r.impressions)}</td>
                  <td className="num">{r.ctr.toFixed(1)}%</td>
                  <td className="num">{num(r.conversions)}</td>
                  <td className="num">{money(r.spend)}</td>
                  <td className="num">{money(r.cpa)}</td>
                  <td className="num">
                    <strong style={{ fontWeight: 500 }}>
                      {r.roas.toFixed(2)}x
                    </strong>
                  </td>
                  <td className="num">
                    {r.qualityScore != null ? (
                      <span
                        className={`status ${
                          r.qualityScore >= 7
                            ? "good"
                            : r.qualityScore >= 5
                            ? "warn"
                            : "bad"
                        }`}
                      >
                        {r.qualityScore}/10
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
