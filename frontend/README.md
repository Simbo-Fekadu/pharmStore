# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Desktop (Electron) Packaging

The frontend can be packaged as a Windows desktop application using Electron + electron-builder.

### Scripts

| Command                          | Purpose                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `npm run desktop:dev`            | Run Vite dev server + launch Electron pointed at it           |
| `npm run desktop:build`          | Build renderer and create NSIS installer (in `dist-desktop/`) |
| `npm run desktop:build:portable` | Build and create a portable single-exe variant                |

### One-time Setup

```bash
cd frontend
npm install
```

### Build (Installer)

PowerShell:

```powershell
$env:VITE_API_BASE="https://your-backend-domain.example"
npm run desktop:build
```

CMD:

```cmd
set VITE_API_BASE=https://your-backend-domain.example
npm run desktop:build
```

Output: `dist-desktop/PharmStore Setup <version>.exe`

### Build (Portable)

```powershell
npm run desktop:build:portable
```

### Icon

Place `build/icon.ico` before running the build (multi-size 16..256 embedded). If absent, a generic icon is used.

### Environment Variables

Only variables prefixed with `VITE_` are embedded at build time (e.g. `VITE_API_BASE`). Do **not** embed secrets.

### Using Local Backend During Development

To point the frontend to your local backend (e.g., running on `http://localhost:3000`):

1. Create or edit `frontend/.env.development` with:

```env
VITE_API_BASE=http://localhost:3000
```

2. Start servers in two terminals:

```powershell
cd backend; npm start
```

```powershell
cd frontend; npm run dev
```

The app will call APIs at `http://localhost:3000/backend/...`.

### Security Notes

- Do **not** commit `.env` files containing secrets (Mongo credentials, JWT secret). These are ignored via `.gitignore`.
- Rotate any previously committed credentials.
- Unsigned Windows builds may trigger SmartScreen; acquire a code signing cert for broad distribution.

### Future Enhancements (Optional)

- Auto-updates via `electron-updater`.
- In-app settings screen for API endpoint.
- Crash reporting / telemetry (privacy compliant).

## Release Notes

### 0.0.1 (Initial Desktop Preview)

Hardening & cleanup before first tagged release:

- Added Content Security Policy restricting external domains to Google Fonts and API endpoints.
- Removed development debug overlays and preload warning banners from production renderer.
- DevTools now open only in development builds (not in packaged production).
- Implemented single instance lock to prevent multiple running copies.
- Set explicit `AppUserModelID` for Windows taskbar grouping / notifications.
- Introduced version bump to `0.0.1` and documented build workflow.

Security TODOs for a future minor release:

- Re-enable `sandbox: true` (after verifying preload adjustments).
- Consider code signing certificate for distribution (SmartScreen trust).
- Optional auto-update integration (`electron-updater`).
- Add crash / diagnostics reporting (privacy aware).

### Building 0.0.1

```powershell
# From frontend directory
$env:VITE_API_BASE="https://your-production-backend.example"; npm run desktop:build
```

Artifacts appear under `dist-desktop/`:

- Installer: `PharmStore Setup 0.0.1.exe`
- Portable: `PharmStore 0.0.1.exe`

Distribute one of the above (not the entire folder). For end users unfamiliar with configuration, prefer the installer.
