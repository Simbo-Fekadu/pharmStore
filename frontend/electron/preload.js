import { contextBridge } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

// Expose a minimal, safe API to the renderer
let runtimeConfig = {};
try {
  // config.json will be placed next to the asar (copied from build step) or in resources directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const possible = [
    path.join(process.resourcesPath || "", "config.json"),
    path.join(__dirname, "..", "config.json"),
  ];
  for (const p of possible) {
    if (p && fs.existsSync(p)) {
      const raw = fs.readFileSync(p, "utf-8");
      runtimeConfig = JSON.parse(raw);
      break;
    }
  }
} catch {
  // swallow; fallback to empty config
}

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  config: runtimeConfig,
  getVersion: () =>
    process && process.versions ? process.versions.electron : undefined,
  emit: (channel, payload) => {
    window.dispatchEvent(
      new CustomEvent(`desktop:${channel}`, { detail: payload })
    );
  },
});
