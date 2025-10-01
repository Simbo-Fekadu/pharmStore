import User from "../models/user.model.js";
import Medicine from "../models/medicine.model.js";
import { StockLedger, StockBalance } from "../models/inventory.model.js";
import Branch from "../models/branch.model.js";
import xlsx from "xlsx";
import PDFDocument from "pdfkit";

// Helper: generate rows/columns based on type
async function buildDataset(type, scope, query) {
  if (type === "users") {
    const q = scope?.pharmacy
      ? { pharmacy: scope.pharmacy, role: { $ne: "super_admin" } }
      : { role: { $ne: "super_admin" } };
    const users = await User.find(q)
      .select("username email role createdAt branch")
      .populate("branch", "name")
      .lean();
    const columns = ["Username", "Email", "Role", "Branch", "Created At"];
    const rows = users.map((u) => [
      u.username,
      u.email,
      u.role,
      u.branch?.name || "",
      u.createdAt ? new Date(u.createdAt).toISOString() : "",
    ]);
    return { columns, rows };
  }
  if (type === "medicines") {
    const q = scope?.pharmacy
      ? { pharmacy: scope.pharmacy, isDeleted: false }
      : { isDeleted: false };
    const meds = await Medicine.find(q)
      .select(
        "medicineName category batchNumber expiryDate purchasePrice sellingPriceBase sellingPricePack createdAt"
      )
      .lean();
    const columns = [
      "Name",
      "Category",
      "Batch",
      "Expiry",
      "Purchase Price",
      "Sell/Base",
      "Sell/Pack",
      "Created At",
    ];
    const rows = meds.map((m) => [
      m.medicineName,
      m.category,
      m.batchNumber,
      m.expiryDate ? new Date(m.expiryDate).toISOString().slice(0, 10) : "",
      m.purchasePrice ?? "",
      m.sellingPriceBase ?? "",
      m.sellingPricePack ?? "",
      m.createdAt ? new Date(m.createdAt).toISOString() : "",
    ]);
    return { columns, rows };
  }
  if (type === "branch_medicines") {
    // For each branch, list its on-hand stock (StockBalance) joined with medicine
    let branchFilter = {};
    if (query?.branchId) {
      branchFilter.locationId = query.branchId;
    }
    if (scope?.pharmacy) {
      const branches = await Branch.find({ pharmacy: scope.pharmacy })
        .select("_id")
        .lean();
      const ids = branches.map((b) => b._id);
      if (branchFilter.locationId) {
        // ensure selected branch is within pharmacy scope
        if (
          !ids.map((x) => String(x)).includes(String(branchFilter.locationId))
        ) {
          return { columns: [], rows: [] };
        }
      } else {
        branchFilter.locationId = { $in: ids };
      }
    }
    const balances = await StockBalance.find(branchFilter)
      .populate(
        "medicineId",
        "medicineName category batchNumber expiryDate purchasePrice sellingPriceBase sellingPricePack"
      )
      .populate("locationId", "name")
      .lean();
    const columns = [
      "Branch",
      "Medicine",
      "Category",
      "Batch",
      "Expiry",
      "Qty",
      "Purchase Price",
      "Sell/Base",
      "Sell/Pack",
    ];
    const rows = balances.map((b) => [
      b.locationId?.name || "",
      b.medicineId?.medicineName || "",
      b.medicineId?.category || "",
      b.medicineId?.batchNumber || "",
      b.medicineId?.expiryDate
        ? new Date(b.medicineId.expiryDate).toISOString().slice(0, 10)
        : "",
      b.onHandQty || 0,
      b.medicineId?.purchasePrice ?? "",
      b.medicineId?.sellingPriceBase ?? "",
      b.medicineId?.sellingPricePack ?? "",
    ]);
    return { columns, rows };
  }
  if (type === "transactions") {
    // Scope by pharmacy => branches first
    let branchFilter = {};
    if (scope?.pharmacy) {
      const branches = await Branch.find({ pharmacy: scope.pharmacy })
        .select("_id")
        .lean();
      const ids = branches.map((b) => b._id);
      branchFilter = { locationId: { $in: ids } };
    }
    const txns = await StockLedger.find(branchFilter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .select("medicineId locationId quantity transactionType createdAt status")
      .populate("medicineId", "medicineName")
      .populate("locationId", "name")
      .lean();
    const columns = ["Date", "Branch", "Medicine", "Qty", "Type", "Status"];
    const rows = txns.map((t) => [
      t.createdAt ? new Date(t.createdAt).toISOString() : "",
      t.locationId?.name || "",
      t.medicineId?.medicineName || "",
      t.quantity,
      t.transactionType,
      t.status,
    ]);
    return { columns, rows };
  }
  return { columns: [], rows: [] };
}

export const exportData = async (req, res) => {
  try {
    const { type, format, preview } = req.query;
    if (!type)
      return res.status(400).json({ success: false, message: "type required" });
    const allowedTypes = [
      "users",
      "medicines",
      "transactions",
      "branch_medicines",
    ];
    if (!allowedTypes.includes(type))
      return res.status(400).json({ success: false, message: "invalid type" });
    const scope = {};
    if (req.user && req.user.role !== "super_admin" && req.user.pharmacy) {
      scope.pharmacy = req.user.pharmacy;
    }
    const { columns, rows } = await buildDataset(type, scope, req.query);
    if (preview) {
      return res.json({ success: true, columns, rows: rows.slice(0, 100) });
    }
    const fmt = (format || "xlsx").toLowerCase();
    const filenameBase = `${type}_export_${Date.now()}`;
    if (fmt === "xlsx" || fmt === "excel") {
      const wb = xlsx.utils.book_new();
      const aoa = [columns, ...rows];
      const ws = xlsx.utils.aoa_to_sheet(aoa);
      xlsx.utils.book_append_sheet(wb, ws, type.substring(0, 31));
      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filenameBase}.xlsx"`
      );
      return res.status(200).send(buf);
    }
    if (fmt === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filenameBase}.pdf"`
      );
      const doc = new PDFDocument({ margin: 30, size: "A4" });
      doc.pipe(res);
      doc
        .fontSize(16)
        .text(`${type.toUpperCase()} EXPORT`, { underline: true });
      doc.moveDown();
      // Simple table: fixed width columns
      const colWidths = columns.map(() => 90);
      const maxColsWidth = colWidths.reduce((a, b) => a + b, 0);
      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const scale = pageWidth / maxColsWidth;
      const scaled = colWidths.map((w) => w * scale);
      doc.fontSize(9).fillColor("#000");
      // Header row
      columns.forEach((c, idx) => {
        doc.text(c, {
          continued: idx !== columns.length - 1,
          width: scaled[idx],
        });
      });
      doc.moveDown(0.5);
      rows.forEach((r) => {
        r.forEach((cell, idx) => {
          const val = cell == null ? "" : String(cell);
          doc.text(val, {
            continued: idx !== r.length - 1,
            width: scaled[idx],
          });
        });
        doc.moveDown(0.2);
      });
      doc.end();
      return; // stream response
    }
    return res
      .status(400)
      .json({ success: false, message: "unsupported format" });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
