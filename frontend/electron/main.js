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
      sandbox: false,
      devTools: true,
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
    win.webContents.openDevTools({ mode: "detach" });
  };
  loadApp();
}

app.whenReady().then(async () => {
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
