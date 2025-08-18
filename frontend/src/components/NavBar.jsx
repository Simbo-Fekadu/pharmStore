import React from "react";
import { useTheme } from "./useTheme.js";

const NavBar = () => {
  const { theme, toggle } = useTheme();
  return (
    <nav className="flex items-center justify-between p-4 bg-white/5 backdrop-blur border-b border-white/10">
      <div className="font-semibold tracking-wide">PharmStore</div>
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={toggle}
          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 border border-white/10"
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>
        <span className="opacity-70">Welcome</span>
      </div>
    </nav>
  );
};

export default NavBar;
