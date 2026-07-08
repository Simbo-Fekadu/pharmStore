import { useState, useEffect } from "react";
import { API_BASE } from "../api/base";
import { authFetch } from "../api/authFetch";

export function usePharmacy() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("role");
    if (role !== "super_admin") {
      setPharmacies([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchPharmacies = async () => {
      try {
        const res = await authFetch(`${API_BASE}/superadmin/pharmacies`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success && Array.isArray(data.pharmacies)) {
          setPharmacies(data.pharmacies);
          setSelectedPharmacyId((prev) => {
            if (prev) return prev;
            if (data.pharmacies[0]?._id) return data.pharmacies[0]._id;
            return "";
          });
        } else {
          setError(data.message || "Failed to load pharmacies");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Network error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPharmacies();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    pharmacies,
    loading,
    error,
    selectedPharmacyId,
    setSelectedPharmacyId,
  };
}
