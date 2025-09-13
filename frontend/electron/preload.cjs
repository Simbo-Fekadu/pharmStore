// CommonJS preload for Electron
const { contextBridge } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

let runtimeConfig = {};
try {
  const candidates = [
    path.join(process.resourcesPath || "", "config.json"),
    path.join(__dirname, "..", "config.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      runtimeConfig = JSON.parse(fs.readFileSync(p, "utf8"));
      break;
    }
  }
} catch (e) {
  // ignore
}

contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  config: runtimeConfig,
});
