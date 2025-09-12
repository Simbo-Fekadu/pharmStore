"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiBase } from "../api/base";

const SignUp = () => {
  const [form, setForm] = useState({
    username: "",
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
      const res = await fetch(`${getApiBase()}/backend/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, role: "employee" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("Signup successful!");
        setIsError(false);
        // Optionally auto login redirect by role later; for now go sign in
        setTimeout(() => navigate("/signin"), 1500);
      } else {
        setMessage(data.message || "Signup failed");
        setIsError(true);
      }
    } catch {
      setMessage("Error connecting to server");
      setIsError(true);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      style={{ background: "var(--bg-start)" }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_75%_25%,rgba(29,95,167,0.12),transparent_60%),radial-gradient(circle_at_25%_75%,rgba(5,151,217,0.12),transparent_55%)]" />
      <div className="bg-white/90 dark:bg-[var(--panel-bg)] backdrop-blur-md shadow-xl ring-1 ring-black/5 dark:ring-white/10 rounded-2xl p-6 sm:p-8 md:p-10 w-full max-w-sm sm:max-w-md relative">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-[var(--brand)] to-[var(--accent)] bg-clip-text text-transparent">
            Sign Up
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 placeholder-gray-400"
            />
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 placeholder-gray-400"
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition duration-200 placeholder-gray-400"
            />
          </div>

          {/* Role selection removed: all signups become employees */}

          <button
            type="submit"
            className="w-full relative group overflow-hidden bg-[var(--brand)] text-white py-3 px-4 rounded-lg font-semibold focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-0 transition duration-200"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[var(--brand)] via-[var(--accent)] to-[var(--brand)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative">Sign Up</span>
          </button>
          {message && (
            <div
              className={`mt-4 text-center text-sm font-semibold ${
                isError ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SignUp;
