# PharmStore Desktop (Hybrid Online/Offline Strategy)

This desktop build uses Electron as a secure shell around the existing web frontend and a remote backend API. It adds groundwork for **offline-capable queued mutations** without bundling the full Express API locally (yet). The goal: fast iteration + future offline resilience.

## Architecture

- Remote Express/Mongo backend remains the single source of truth.
- Electron renderer = Vite build loaded in a BrowserWindow.
- Preload exposes a minimal `window.desktop` object for environment detection.
- Future offline: IndexedDB cache + mutation queue (not yet implemented in this commit).

## Why Hybrid?

You required both online and offline eventually, but full local backend bundling would increase complexity (local DB, sync). This approach lets you ship desktop quickly and layer offline sync later.

## Folder Structure

```
frontend/
  electron/
    main.js        # Electron main process
    preload.js     # Safe bridge (contextIsolation)
  src/api/base.js  # Central API base resolution
```

## Dev Workflow

Install additional deps (example):

```
npm install --save-dev electron electron-builder concurrently wait-on cross-env
```

Then add scripts (example):

```
"desktop:dev": "concurrently \"vite\" \"cross-env VITE_DESKTOP=1 electron .\"",
"desktop:build": "vite build && electron-builder --win --config electron-builder.yml"
```

(You still need to add an electron-builder config or embed it in package.json.)

## Security Hardening Checklist

- contextIsolation: true ✅
- nodeIntegration: false ✅
- sandbox: true ✅
- Block window.open/navigation ✅
- TODO: CSP meta tag in index.html
- TODO: IPC channels (when needed only)

## Offline Roadmap

1. IndexedDB tables: `cache_medicines`, `cache_requests`, `queue_mutations`.
2. On network loss: push POST/PUT/DELETE into queue.
3. On reconnect: replay sequentially with conflict resolution (server timestamp wins).
4. Background sync trigger: focus event + interval.

## Version & Updates

Add auto-update (electron-updater) after first release. Code signing recommended for production distribution.

## Building

```
npm run desktop:build
```

Creates Windows installer (after you configure electron-builder). Asar packaging enabled by default recommended.

## Next Steps

- Add electron-builder config
- Add mutation queue service
- Implement lightweight offline read cache
- Integrate auto-updater
- Code sign for production

---

_This document will evolve as offline features are implemented._
