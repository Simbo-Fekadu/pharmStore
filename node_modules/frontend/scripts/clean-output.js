// Clean previous electron-builder unpacked output to avoid file locks on Windows
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd());
const distDir = path.join(root, "dist-desktop");
const targets = [
  path.join(distDir, "win-unpacked"),
  path.join(distDir, "win-ia32-unpacked"),
];

function rimrafSyncSafe(p) {
  if (!fs.existsSync(p)) return;
  try {
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) {
        rimrafSyncSafe(path.join(p, entry));
      }
      try {
        fs.rmdirSync(p);
      } catch (e) {
        void e; /* ignore */
      }
    } else {
      try {
        fs.chmodSync(p, 0o666);
      } catch (e) {
        void e; /* ignore */
      }
      try {
        fs.unlinkSync(p);
      } catch (e) {
        void e; /* ignore */
      }
    }
  } catch (e) {
    void e; /* ignore */
  }
}

function cleanWithRetries(paths, retries = 3, delayMs = 600) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const p of paths) rimrafSyncSafe(p);
    const remaining = paths.filter((p) => fs.existsSync(p));
    if (remaining.length === 0) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
  }
  return paths.every((p) => !fs.existsSync(p));
}

const ok = cleanWithRetries(targets);
if (!ok) {
  console.warn(
    "[clean-output] Some paths could not be removed (may still be locked):",
    targets.filter((p) => fs.existsSync(p))
  );
}
