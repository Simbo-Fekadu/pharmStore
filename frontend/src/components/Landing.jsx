"use client";

import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { ThemeContext } from "./ThemeProvider";
import {
  ArrowRight,
  Pill,
  Shield,
  Users,
  Clock,
  Package,
  MessageSquare,
  BarChart3,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/20">
      <header className="w-full px-6 py-6 flex items-center justify-between max-w-7xl mx-auto backdrop-blur-sm">
        <div className="flex items-center gap-3 font-bold text-2xl tracking-tight">
          <div className="p-2 bg-primary rounded-xl shadow-lg">
            <Pill className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-primary">PharmStore</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/signin")}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl border-2 border-primary/20 hover:border-primary/40 bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-200"
          >
            Sign Up
          </button>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
            className="p-2 rounded-xl border-2 border-primary/10 hover:border-primary/40 bg-white/80 dark:bg-white/10 backdrop-blur-sm transition-all"
          >
            {theme === "dark" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-yellow-400"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41M16.66 16.66l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-slate-700"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center px-6 py-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl sm:text-6xl font-black leading-tight text-slate-900">
              Simple pharmacy <span className="text-primary">inventory</span> &{" "}
              <span className="text-secondary">branch request</span> management
            </h1>

            <p className="text-xl text-slate-600 leading-relaxed max-w-2xl">
              Manage medicines, track branch requests, approve or reject stock
              transfers, monitor near-expiry items, and chat across your team—
              all in one minimal system.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 py-4">
              <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-slate-700 font-medium">
                  Global team chat
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <Package className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-slate-700 font-medium">
                  Branch stock requests
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-slate-700 font-medium">
                  Central store validation
                </span>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-slate-700 font-medium">
                  Near-expiry tracking
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                onClick={() => navigate("/signin")}
                className="group relative overflow-hidden px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary via-cyan-600 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative inline-flex items-center gap-3">
                  Get Started{" "}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-8 py-4 rounded-xl font-semibold text-lg border-2 border-primary/20 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-primary/40 transition-all duration-200 hover:shadow-lg"
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl blur-3xl"></div>
            <div className="relative p-8 rounded-3xl border border-slate-200/50 bg-white/80 backdrop-blur-sm shadow-2xl space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <BarChart3 className="w-6 h-6 text-primary" />
                <span className="text-lg font-bold text-slate-900">
                  System Overview
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-bold text-slate-900">Requests</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                      Pending
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      Approved
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-2xl border border-secondary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-slate-900">Medicines</span>
                  </div>
                  <span className="text-xs text-slate-600">
                    Near expiry tracking
                  </span>
                </div>

                <div className="p-4 bg-gradient-to-br from-blue-100/50 to-blue-50 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="font-bold text-slate-900">Chat</span>
                  </div>
                  <span className="text-xs text-slate-600">
                    Real-time polling
                  </span>
                </div>

                <div className="p-4 bg-gradient-to-br from-purple-100/50 to-purple-50 rounded-2xl border border-purple-200/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-slate-900">Suppliers</span>
                  </div>
                  <span className="text-xs text-slate-600">Manage sources</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/50">
                <p className="text-sm text-slate-600 text-center font-medium">
                  Focused feature set—no bloated extras.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-slate-500 border-t border-slate-200/50 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          © {new Date().getFullYear()} PharmStore. Internal demo interface.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
