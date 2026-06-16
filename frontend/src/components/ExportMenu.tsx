import { useState, type RefObject } from "react";
import { exportNode, type ExportFormat } from "../lib/export";

const FORMATS: { key: ExportFormat; label: string }[] = [
  { key: "png", label: "PNG image" },
  { key: "jpeg", label: "JPEG image" },
  { key: "pdf", label: "PDF document" },
];

/** Dropdown that exports a target DOM node as PNG / JPEG / PDF. */
export function ExportMenu({
  targetRef,
  filename,
}: {
  targetRef: RefObject<HTMLElement | null>;
  filename: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (format: ExportFormat) => {
    const node = targetRef.current;
    if (!node) return;
    setOpen(false);
    setBusy(true);
    try {
      await exportNode(node, filename, format);
    } catch (e) {
      console.error("Chart export failed", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "relative", marginLeft: "auto" }}>
      <button
        className="pill"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {busy ? "Exporting…" : "⬇ Export charts"}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▼</span>
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 19 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="card"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              zIndex: 20,
              minWidth: 150,
              padding: 6,
              boxShadow: "rgba(0,55,112,0.12) 0 12px 32px",
            }}
          >
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => run(f.key)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "7px 10px",
                  fontSize: 12,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderRadius: 6,
                  color: "var(--ink)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
