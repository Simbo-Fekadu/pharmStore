import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

// Allow forcing dev/prod logic via env for debugging packaged build locally
const forceProd = process.env.FORCE_PROD === "1";
const forceDev = process.env.FORCE_DEV === "1";
const isDev = forceDev || (!app.isPackaged && !forceProd);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#0f1115",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // TODO: Re-enable sandbox after verifying preload remains compatible
      sandbox: false,
      devTools: isDev,
      spellcheck: false,
    },
  });

  // Security: block navigation attempts
  win.webContents.on("will-navigate", (e, navUrl) => {
    if (navUrl !== win.webContents.getURL()) {
      e.preventDefault();
    }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const loadApp = async () => {
    if (isDev) {
      await win.loadURL("http://localhost:5173");
    } else {
      const indexPath = path.join(__dirname, "../dist/index.html");
      await win.loadFile(indexPath).catch((err) => {
        console.error("Failed to load index.html", indexPath, err);
      });
    }
    if (isDev) {
      win.webContents.openDevTools({ mode: "detach" });
    }
  };
  loadApp();
}

// Ensure single instance (prevents multiple updaters and data races)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

app.whenReady().then(async () => {
  // Sets correct AppUserModelID for notifications / taskbar grouping on Windows
  app.setAppUserModelId("com.pharmstore.app");
  createWindow();

  // Global error logging to help diagnose blank screen issues
  process.on("uncaughtException", (e) => {
    console.error("[Main] uncaughtException:", e);
  });
  process.on("unhandledRejection", (r) => {
    console.error("[Main] unhandledRejection:", r);
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
