// Deprecated: Quick Medicine form has been removed. This file is left as a no-op to avoid broken imports.
import React from "react";
export default function MedicineQuickForm() {
  if (typeof console !== "undefined") {
    // Surface once per mount if someone still imports this by mistake
    console.warn(
      "MedicineQuickForm is deprecated and does nothing. Use the dedicated Add Medicine page at /admin/medicines/add."
    );
  }
  return null;
}
