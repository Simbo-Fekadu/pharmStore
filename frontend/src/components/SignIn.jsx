"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
      const res = await fetch("http://localhost:3000/backend/auth/signin", {
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
        setMessage("Signin successful!");
        setIsError(false);
        setTimeout(() => {
          const role = data.user?.role;
          if (role === "admin") navigate("/admin");
          else navigate("/home");
        }, 1000);
      } else {
        setMessage(data.message || "Signin failed");
        setIsError(true);
      }
    } catch {
      setMessage("Error connecting to server");
      setIsError(true);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-4 px-4 sm:py-8 sm:px-6 lg:px-8"
      style={{ background: "var(--bg-start)" }}
    >
      {/* Mobile: full width with margin, Tablet: max-width, Desktop: centered with max-width */}
      <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl">
        <div className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-lg p-6 sm:p-8 md:p-10 lg:p-12 border border-white/20">
          {/* Header - responsive text sizing */}
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
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
            <div>
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

            <div>
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
              className="w-full bg-blue-600 text-white py-2.5 px-4 sm:py-3 sm:px-4 md:py-4 md:px-6 text-sm sm:text-base md:text-lg rounded-lg font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In
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
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs sm:text-sm text-gray-500">
              Don't have an account?{" "}
              <button
                onClick={() => navigate("/signup")}
                className="text-blue-600 hover:text-blue-700 font-medium transition duration-200"
              >
                Sign up here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
