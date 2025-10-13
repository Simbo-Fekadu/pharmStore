import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase } from "../api/base";

const Logout = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogout = async () => {
    setMessage("");
    setIsError(false);
    try {
      localStorage.removeItem("token");
      const res = await fetch(`${getApiBase()}/backend/auth/signout`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Logged out successfully!");
        setTimeout(() => navigate("/"), 1500);
      } else {
        setMessage(data.message || "Logout failed");
        setIsError(true);
      }
    } catch {
      setMessage("Error connecting to server");
      setIsError(true);
    }
  };

  return (
    <div>
      <button
        className="w-full bg-[#5C8374] text-white py-2 rounded hover:bg-[#93B1A6] transition font-semibold text-base sm:text-lg"
        onClick={handleLogout}
      >
        Logout
      </button>
      {message && (
        <div
          className={`mt-2 text-center text-sm font-semibold ${
            isError ? "text-red-600" : "text-green-600"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default Logout;
