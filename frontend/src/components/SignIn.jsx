"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../api/base";

const SignIn = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user?.role) {
          localStorage.setItem("role", data.user.role);
        }
        // Persist full user (with branch reference) for session-based branch logic
        try {
          localStorage.setItem("user", JSON.stringify(data.user));
        } catch {
          /* ignore */
        }
        setMessage("Signin successful!");
        setIsError(false);
        setTimeout(() => {
          const role = data.user?.role;
          if (role === "admin" || role === "super_admin") navigate("/admin");
          else navigate("/employee");
        }, 1000);
      } else {
        setMessage(data.message || `Signin failed (HTTP ${res.status})`);
        setIsError(true);
      }
    } catch (err) {
      setMessage(`Error connecting to server: ${err?.message || "Network"}`);
      setIsError(true);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-6 px-4 sm:py-10 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ background: "var(--bg-start)" }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_20%_30%,rgba(29,95,167,0.12),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(5,151,217,0.12),transparent_55%)]" />
      {/* Mobile: full width with margin, Tablet: max-width, Desktop: centered with max-width */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl relative">
        <div className="bg-white/90 dark:bg-[var(--panel-bg)] backdrop-blur-md shadow-xl ring-1 ring-black/5 dark:ring-white/10 rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12">
          {/* Header - responsive text sizing */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-[var(--brand)] to-[var(--accent)] bg-clip-text text-transparent">
              Sign In
            </h2>
            <p className="mt-2 text-xs sm:text-sm md:text-base text-gray-600">
              Access your account
            </p>
          </div>

          {/* Form with responsive spacing */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-5 md:space-y-6"
          >
            <div className="space-y-1">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 placeholder-gray-400"
              />
            </div>

            <div className="space-y-1">
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 placeholder-gray-400"
              />
            </div>

            {/* Responsive button */}
            <button
              type="submit"
              className="w-full relative group overflow-hidden bg-[var(--brand)] text-white py-2.5 px-4 sm:py-3 sm:px-4 md:py-4 md:px-6 text-sm sm:text-base md:text-lg rounded-lg font-semibold focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-0 transition duration-200"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Sign In</span>
            </button>

            {/* Responsive message display */}
            {message && (
              <div
                className={`mt-3 sm:mt-4 text-center text-xs sm:text-sm md:text-base font-semibold ${
                  isError ? "text-red-600" : "text-green-600"
                }`}
              >
                {message}
              </div>
            )}
          </form>

          {/* Additional responsive elements */}
          {/* Self-signup removed: accounts are created by admins */}
        </div>
      </div>
    </div>
  );
};

export default SignIn;
