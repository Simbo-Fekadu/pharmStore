import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";

const API = API_BASE;

const DATASETS = [
  { key: "users", label: "Users" },
  { key: "medicines", label: "Medicines" },
  { key: "transactions", label: "Transactions" },
  { key: "branch_medicines", label: "Branch Medicines" },
];
const FORMATS = [
  { key: "xlsx", label: "Excel (.xlsx)" },
  { key: "pdf", label: "PDF (single type)" },
];

export default function ExportCenter() {
  // Super admin scope: choose pharmacy and optional branch
  const [pharmacies, setPharmacies] = useState({
    loading: false,
    error: null,
    items: [],
    loaded: false,
  });
  const [selectedPharmacy, setSelectedPharmacy] = useState("");
  const [branches, setBranches] = useState({
    loading: false,
    error: null,
    items: [],
    loaded: false,
  });
  const [selectedBranch, setSelectedBranch] = useState("");

  const [types, setTypes] = useState({
    users: true,
    medicines: false,
    transactions: false,
    branch_medicines: false,
  });
  const [format, setFormat] = useState("xlsx");
  const selectedTypes = useMemo(
    () => Object.keys(types).filter((k) => types[k]),
    [types]
  );

  const [preview, setPreview] = useState({
    loading: false,
    columns: [],
    rows: [],
    error: null,
  });
  const [downloading, setDownloading] = useState(false);

  // Load pharmacies (super admin)
  useEffect(() => {
    const load = async () => {
      setPharmacies((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await authFetch(`${API}/superadmin/pharmacies`);
        const txt = await res.text();
        const j = JSON.parse(txt);
        if (!res.ok || !j.success)
          throw new Error(j.message || `HTTP ${res.status}`);
        const items = j.pharmacies || [];
        setPharmacies({ loading: false, error: null, items, loaded: true });
        if (items.length && !selectedPharmacy)
          setSelectedPharmacy(items[0]._id || items[0].id);
      } catch (e) {
        // If not super admin, we may get 403; keep list empty and allow export without pharmacy selector
        setPharmacies({
          loading: false,
          error: e.message,
          items: [],
          loaded: true,
        });
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load branches for selected pharmacy
  useEffect(() => {
    if (!selectedPharmacy) return;
    const load = async () => {
      setBranches((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await authFetch(
          `${API}/superadmin/pharmacies/${selectedPharmacy}/branches`
        );
        const txt = await res.text();
        const j = JSON.parse(txt);
        if (!res.ok || !j.success)
          throw new Error(j.message || `HTTP ${res.status}`);
        setBranches({
          loading: false,
          error: null,
          items: j.branches || [],
          loaded: true,
        });
      } catch (e) {
        setBranches({
          loading: false,
          error: e.message,
          items: [],
          loaded: true,
        });
      }
    };
    load();
  }, [selectedPharmacy]);

  const loadPreview = async () => {
    // Preview only when exactly one type is selected
    if (selectedTypes.length !== 1) {
      setPreview({
        loading: false,
        columns: [],
        rows: [],
        error: "Select exactly one type to preview.",
      });
      return;
    }
    setPreview((p) => ({ ...p, loading: true, error: null }));
    try {
      const qs = new URLSearchParams();
      qs.set("type", selectedTypes[0]);
      qs.set("preview", "1");
      if (selectedPharmacy) qs.set("pharmacyId", selectedPharmacy);
      if (selectedBranch) qs.set("branchId", selectedBranch);
      const url = `${API}/export/data?${qs.toString()}`;
      const res = await authFetch(url);
      const txt = await res.text();
      const json = JSON.parse(txt);
      if (!res.ok || !json.success)
        throw new Error(json.message || "Preview failed");
      setPreview({
        loading: false,
        columns: json.columns,
        rows: json.rows,
        error: null,
      });
    } catch (e) {
      setPreview({ loading: false, columns: [], rows: [], error: e.message });
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const qs = new URLSearchParams();
      if (selectedTypes.length === 1) qs.set("type", selectedTypes[0]);
      else qs.set("types", selectedTypes.join(","));
      qs.set("format", format);
      if (selectedPharmacy) qs.set("pharmacyId", selectedPharmacy);
      if (selectedBranch) qs.set("branchId", selectedBranch);
      const url = `${API}/export/data?${qs.toString()}`;
      const res = await authFetch(url);
      if (!res.ok) {
        let msg = "Download failed";
        try {
          const j = await res.json();
          if (j?.message) msg = j.message;
        } catch {
          // ignore parse error when response is a blob
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      const nameBase =
        selectedTypes.length === 1 ? `${selectedTypes[0]}_export` : "export";
      const ext = format === "pdf" ? "pdf" : "xlsx";
      a.href = URL.createObjectURL(blob);
      a.download = `${nameBase}.${ext}`;
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
          Select a dataset and format, preview up to 100 rows, then export to
          Excel or PDF.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-3">
          <div className="text-xs uppercase font-semibold text-white/60">
            Pharmacy
          </div>
          {pharmacies.error && (
            <div className="text-rose-400 text-xs">{pharmacies.error}</div>
          )}
          <select
            value={selectedPharmacy}
            onChange={(e) => setSelectedPharmacy(e.target.value)}
            className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
          >
            <option value="">(Select pharmacy)</option>
            {pharmacies.items.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div className="text-xs uppercase font-semibold text-white/60">
            Branch (optional)
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 rounded bg-white/10 border border-white/20 text-sm"
            disabled={!selectedPharmacy || branches.loading}
          >
            <option value="">All branches</option>
            {branches.items.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          <div className="text-xs uppercase font-semibold text-white/60">
            Datasets
          </div>
          <div className="grid grid-cols-1 gap-2">
            {DATASETS.map((d) => (
              <label key={d.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!types[d.key]}
                  onChange={(e) =>
                    setTypes((s) => ({ ...s, [d.key]: e.target.checked }))
                  }
                />
                <span>{d.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-xs uppercase font-semibold text-white/60">
            Format
          </div>
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
          {format === "pdf" && selectedTypes.length !== 1 && (
            <div className="text-[11px] text-amber-300/90">
              PDF only supports a single dataset. Select exactly one.
            </div>
          )}
        </div>
        <div className="flex items-end gap-3">
          <button
            onClick={loadPreview}
            className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm font-medium"
            disabled={preview.loading || selectedTypes.length !== 1}
            title={
              selectedTypes.length !== 1
                ? "Select one dataset to preview"
                : "Preview"
            }
          >
            {preview.loading ? "Loading..." : "Preview"}
          </button>
          <button
            onClick={download}
            disabled={
              downloading ||
              (format === "pdf" && selectedTypes.length !== 1) ||
              selectedTypes.length === 0 ||
              !selectedPharmacy
            }
            className="px-4 py-2 rounded bg-[var(--brand)] text-white text-sm font-medium disabled:opacity-60"
            title={!selectedPharmacy ? "Select a pharmacy" : undefined}
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
      {preview.loading && (
        <div className="text-sm text-white/60">Loading preview...</div>
      )}
      {!preview.loading && preview.rows.length === 0 && !preview.error && (
        <div className="text-sm text-white/50">
          No preview yet. Select exactly one dataset and click Preview.
        </div>
      )}
    </div>
  );
}
