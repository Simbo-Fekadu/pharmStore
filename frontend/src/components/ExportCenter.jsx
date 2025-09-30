import { useState } from "react";
import { getApiBase } from "../api/base";

const API = getApiBase() + "/backend";

const DATASETS = [
  { key: "users", label: "Users" },
  { key: "medicines", label: "Medicines" },
  { key: "transactions", label: "Transactions" },
];
const FORMATS = [
  { key: "xlsx", label: "Excel (.xlsx)" },
  { key: "pdf", label: "PDF" },
];

export default function ExportCenter() {
  const [dataset, setDataset] = useState("users");
  const [format, setFormat] = useState("xlsx");
  const [preview, setPreview] = useState({ loading: false, columns: [], rows: [], error: null });
  const [downloading, setDownloading] = useState(false);

  const loadPreview = async () => {
    setPreview((p) => ({ ...p, loading: true, error: null }));
    try {
      const url = `${API}/export/data?type=${dataset}&preview=1`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Preview failed");
      setPreview({ loading: false, columns: json.columns, rows: json.rows, error: null });
    } catch (e) {
      setPreview({ loading: false, columns: [], rows: [], error: e.message });
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const url = `${API}/export/data?type=${dataset}&format=${format}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        let msg = "Download failed";
        try {
            const j = await res.json();
            if (j?.message) msg = j.message;
          } catch {
            // ignore parse error
          }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      const ext = format === "xlsx" ? "xlsx" : format;
      a.href = URL.createObjectURL(blob);
      a.download = `${dataset}_export.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Export</h1>
        <p className="text-sm text-white/60 mt-1">
          Select a dataset and format, preview up to 100 rows, then export to Excel or PDF.
        </p>
      </div>
      <div className="flex flex-wrap gap-6 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase font-semibold text-white/50">
            Dataset
          </label>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
          >
            {DATASETS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase font-semibold text-white/50">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
          >
            {FORMATS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadPreview}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm font-medium"
            disabled={preview.loading}
          >
            {preview.loading ? "Loading..." : "Preview"}
          </button>
          <button
            onClick={download}
            disabled={downloading}
            className="px-4 py-2 rounded bg-[var(--brand)] text-white text-sm font-medium disabled:opacity-60"
          >
            {downloading ? "Exporting..." : "Export"}
          </button>
        </div>
      </div>
      {preview.error && (
        <div className="p-3 rounded bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">
          {preview.error}
        </div>
      )}
      {!preview.loading && !preview.error && preview.rows.length > 0 && (
        <div className="overflow-auto rounded-lg border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-white/60">
              <tr>
                {preview.columns.map((c) => (
                  <th
                    key={c}
                    className="text-left px-3 py-2 font-medium tracking-wide uppercase text-[11px]"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr
                  key={i}
                  className="odd:bg-white/0 even:bg-white/[0.015] hover:bg-white/10 transition"
                >
                  {r.map((cell, j) => (
                    <td key={j} className="px-3 py-2 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {preview.loading && <div className="text-sm text-white/60">Loading preview...</div>}
      {!preview.loading && preview.rows.length === 0 && !preview.error && (
        <div className="text-sm text-white/50">No preview yet. Click Preview.</div>
      )}
    </div>
  );
}
