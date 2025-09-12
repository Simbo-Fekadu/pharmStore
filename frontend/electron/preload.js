import { contextBridge } from "electron";
import process from "node:process";

// Expose a minimal, safe API to the renderer
contextBridge.exposeInMainWorld("desktop", {
  isElectron: true,
  getVersion: () =>
    process && process.versions ? process.versions.electron : undefined,
  // Allow setting (queued) offline mutations later via an event
  emit: (channel, payload) => {
    window.dispatchEvent(
      new CustomEvent(`desktop:${channel}`, { detail: payload })
    );
  },
});
