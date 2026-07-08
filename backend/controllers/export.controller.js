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
      .limit(10000)
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
      .limit(10000)
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
      .limit(10000)
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
    if (query?.branchId) {
      // If branchId provided, ensure it's within scope (if any)
      if (
        branchFilter.locationId &&
        Array.isArray(branchFilter.locationId.$in)
      ) {
        if (
          !branchFilter.locationId.$in
            .map(String)
            .includes(String(query.branchId))
        ) {
          return { columns: [], rows: [] };
        }
        branchFilter.locationId = query.branchId;
      } else {
        branchFilter.locationId = query.branchId;
      }
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
  // Always set CORS headers for all responses, including streaming (PDF)
  const origin = req.headers.origin;
  if (
    origin &&
    (origin === "http://localhost:5173" || origin === "http://127.0.0.1:5173")
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, Accept"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
  }
  try {
    const { type, types, format, preview, pharmacyId } = req.query;
    // Allow multiple types via types=a,b,c
    const list = (types ? String(types).split(",") : type ? [type] : []).filter(
      Boolean
    );
    if (!list.length)
      return res
        .status(400)
        .json({ success: false, message: "type or types required" });
    const allowedTypes = [
      "users",
      "medicines",
      "transactions",
      "branch_medicines",
    ];
    if (!list.every((t) => allowedTypes.includes(t)))
      return res
        .status(400)
        .json({ success: false, message: "invalid type(s)" });
    const scope = {};
    // Super admin can choose pharmacy via query; others are scoped to their own pharmacy
    if (req.user && req.user.role === "super_admin" && pharmacyId) {
      scope.pharmacy = pharmacyId;
    } else if (
      req.user &&
      req.user.role !== "super_admin" &&
      req.user.pharmacy
    ) {
      scope.pharmacy = req.user.pharmacy;
    }

    // Single dataset path preserved for PDF or preview
    if (
      (preview && list.length === 1) ||
      (String(format || "xlsx").toLowerCase() === "pdf" && list.length === 1)
    ) {
      const singleType = list[0];
      const { columns, rows } = await buildDataset(
        singleType,
        scope,
        req.query
      );
      if (preview) {
        return res.json({ success: true, columns, rows: rows.slice(0, 100) });
      }
      const fmt = (format || "xlsx").toLowerCase();
      const filenameBase = `${singleType}_export_${Date.now()}`;
      if (fmt === "pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filenameBase}.pdf"`
        );
        // --- PDF Table Drawing ---
        const doc = new PDFDocument({ margin: 30, size: "A4" });
        doc.pipe(res);
        doc
          .fontSize(16)
          .text(`${singleType.toUpperCase()} EXPORT`, { underline: true });
        doc.moveDown();
        // Table header
        doc.fontSize(10).fillColor("#222");
        const tableTop = doc.y;
        const colCount = columns.length;
        const pageWidth =
          doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const colWidth = pageWidth / colCount;
        // Draw header background
        doc.save();
        doc
          .rect(doc.page.margins.left, tableTop, pageWidth, 20)
          .fill("#e0e0e0");
        doc.restore();
        // Draw header text
        columns.forEach((c, idx) => {
          doc
            .fillColor("#222")
            .font("Helvetica-Bold")
            .text(c, doc.page.margins.left + idx * colWidth + 2, tableTop + 5, {
              width: colWidth - 4,
              align: "left",
              continued: false,
            });
        });
        // Draw rows
        let y = tableTop + 20;
        doc.font("Helvetica").fontSize(9);
        rows.forEach((r, rowIdx) => {
          // Alternate row background
          if (rowIdx % 2 === 1) {
            doc.save();
            doc.rect(doc.page.margins.left, y, pageWidth, 18).fill("#f7f7f7");
            doc.restore();
          }
          r.forEach((cell, idx) => {
            const val = cell == null ? "" : String(cell);
            doc
              .fillColor("#222")
              .text(val, doc.page.margins.left + idx * colWidth + 2, y + 4, {
                width: colWidth - 4,
                align: "left",
                continued: false,
              });
          });
          y += 18;
          // Page break if needed
          if (y > doc.page.height - doc.page.margins.bottom - 20) {
            doc.addPage();
            y = doc.y;
            // Redraw header on new page
            doc.save();
            doc.rect(doc.page.margins.left, y, pageWidth, 20).fill("#e0e0e0");
            doc.restore();
            columns.forEach((c, idx) => {
              doc
                .fillColor("#222")
                .font("Helvetica-Bold")
                .text(c, doc.page.margins.left + idx * colWidth + 2, y + 5, {
                  width: colWidth - 4,
                  align: "left",
                  continued: false,
                });
            });
            y += 20;
            doc.font("Helvetica").fontSize(9);
          }
        });
        doc.end();
        return;
      }
      // Fallthrough for single-type non-pdf handled below (xlsx)
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([columns, ...rows]);
      xlsx.utils.book_append_sheet(wb, ws, singleType.substring(0, 31));
      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${singleType}_export_${Date.now()}.xlsx"`
      );
      return res.status(200).send(buf);
    }

    // Multi-type: build a workbook with a sheet per type
    const fmt = (format || "xlsx").toLowerCase();
    if (fmt !== "xlsx" && fmt !== "excel") {
      return res.status(400).json({
        success: false,
        message: "multi-type export only supports xlsx",
      });
    }
    const wb = xlsx.utils.book_new();
    for (const t of list) {
      const { columns, rows } = await buildDataset(t, scope, req.query);
      const ws = xlsx.utils.aoa_to_sheet([columns, ...rows]);
      xlsx.utils.book_append_sheet(wb, ws, t.substring(0, 31));
    }
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="export_${Date.now()}.xlsx"`
    );
    return res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
