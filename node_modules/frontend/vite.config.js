import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// Use relative base so Electron can load local assets from file:// protocol when packaged
export default defineConfig({
  base: "./",
  plugins: [tailwindcss(), react()],
});
