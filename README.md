# PharmStore
<img width="1893" height="863" alt="image" src="https://github.com/user-attachments/assets/1ab879b3-b6b4-4427-9f15-f5c73615f4cf" />

<img width="1887" height="866" alt="image" src="https://github.com/user-attachments/assets/504be9aa-559c-4a85-a47e-e905c861a0be" />

A full‑stack pharmacy inventory and branch management system built with a **React (Vite) frontend** and a **Node.js / Express / MongoDB** backend. It supports centralized medicine inventory, branch request workflows, supplier & branch administration, and rich dashboard insights.

---

## ✨ Key Features

### Inventory & Medicines

- CRUD for medicines with fields: name, brand, category, unit, batch, expiry, pricing, quantity, supplier linkage.
- Soft delete (trash) workflow with separate trash view for recovery/purge (hard delete not shown in UI yet).
- Automatic exclusion of expired items from active listings; near‑expiry highlighting logic prepared.
- Category aggregation and distribution views (horizontal bars & donut) sorted alphabetically.

### Branch Requests & Chat

- Branch (or future employee) can create inventory transfer / restock requests.
- Admin can view request details and send chat-like messages (messages array stored on request model).
- Approval / rejection actions integrated with request lifecycle (backend endpoints implemented).

### Suppliers & Branches

- CRUD screens for suppliers (name, contact, address) and branches.
- Supplier autocomplete in medicine form; unknown typed supplier name can be created implicitly on save (if logic enabled in controller).

### Users

- Basic user management scaffold (listing; auth token placeholder check on layout mount). Authentication layer is minimal and should be hardened before production.

### Dashboard & Analytics

- Metric cards: Active medicines, Near Expiry (90d), Expired count, Trash count with radial percentage rings.
- Category Distribution (A–Z) bar chart (quantity sum) with percentage share labels.
- Category Donut chart (ring) showing proportional category composition.
- (Previously) Expiry bucket interactive bar chart – removed per recent change but code history retained in git prior to removal if needed.

### Responsive Admin UI

- Mobile‑optimized sidebar converts to a slide‑in drawer with toggle.
- Dashboard charts adapt: stacked vertically on mobile, side‑by‑side on desktop.
- Light & dark theme with CSS custom properties; overrides ensure contrast in light mode.

### Theming & Styling

- Tailwind CSS (v4) with custom CSS variables for palette (`--brand`, `--accent`, neutrals, semantic text colors).
- Glass / frosted panels with backdrop blur and subtle gradients.
- Utility overrides to map legacy `text-white/x` opacities to semantic colors in light mode for accessibility.

### Accessibility & UX Enhancements

- Interactive elements include `aria-label` and keyboard focus states (e.g., previous expiry buckets chart, menu toggles).
- Truncated text tooltips via native `title` attribute for long category names.

---

## 🗂 Project Structure

```
pharmStore/
  backend/
    index.js                # Express app bootstrap
    controllers/            # Route handlers (auth, inventory, suppliers, etc.)
    models/                 # Mongoose schemas (medicine, inventory, supplier, user, branch, store)
    routes/                 # Express routers
    utils/                  # Error handling & auth helpers
  frontend/
    src/
      components/           # React components (Admin*, layout, charts)
      main.jsx              # App root (React Router mounting)
      App.jsx
      index.css             # Tailwind & theme variables
    vite.config.js
```

---

## 🧩 Tech Stack

| Layer    | Technology                                             |
| -------- | ------------------------------------------------------ |
| Frontend | React 19, React Router 7, Tailwind CSS 4, Lucide Icons |
| Backend  | Node.js, Express 5, MongoDB (Mongoose 8)               |
| Auth     | JSON Web Tokens (basic implementation)                 |
| Tooling  | Vite, ESLint                                           |

---

## ⚙️ Setup & Run

### Prerequisites

- Node.js 18+
- MongoDB running locally or a connection URI

### 1. Clone & Install

```bash
git clone <repo-url>
cd pharmStore
cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment Variables (Backend)

Create `backend/.env`:

```
PORT=3000
MONGO_URI=mongodb://localhost:27017/pharmstore
JWT_SECRET=replace_this_secret
```

### 3. Start Development

In two terminals:

```bash
# Terminal 1
cd backend
npm start

# Terminal 2
cd frontend
npm run dev
```

Open http://localhost:5173 (default Vite port).

---

## 🔐 Authentication Notes

Current auth check is minimal (token presence in `localStorage`). For production:

- Add password hashing (bcrypt already present) during user creation.
- Implement refresh tokens / expiration handling.
- Enforce role-based access (admin vs branch users).

---

## 🗄 Data Models (Highlights)

### Medicine

```
medicineName, brand, category, unit,
expiryDate, batchNumber, quantity,
purchasePrice, sellingPrice, supplier, isDeleted
```

### Request (extended)

```
items[], status, messages[{ sender, text, createdAt }]
```

### Supplier / Branch / User

Standard identification + contact fields; can be extended (e.g., geolocation, performance metrics).

---

## 🚀 Roadmap Ideas

| Area                 | Enhancement                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| Analytics            | Re-introduce expiry bucket chart or trend lines once sales data exists           |
| Sales                | Add `sales` collection (date, items[], total, branch) + dashboard revenue trends |
| Prescriptions        | Add prescription model linking patient -> medicines dispensed                    |
| Supplier Performance | Delivery logs with lead time analytics                                           |
| Notifications        | Email / in-app alerts for near-expiry thresholds                                 |
| Access Control       | Role-based permissions & audit logging                                           |
| Testing              | Add Jest + React Testing Library & Supertest for API                             |

---

## ♿ Accessibility & Performance Considerations

- Replace remaining hard-coded white text classes with semantic helpers.
- Consider lazy loading large tables (virtualization) if dataset grows.
- Add ARIA roles for tables & status regions.

---

## 🧪 Testing (Planned)

Testing scaffold not yet added. Recommended:

- Unit: model validation & utility functions.
- API: inventory CRUD, request workflow, auth flows.
- UI: form submission, request messaging interactions.

---

## 📦 Deployment Notes

- Serve frontend as static build behind reverse proxy (Nginx / Caddy).
- Configure process manager for backend (PM2, systemd) & environment secrets.
- Enable CORS restrictions to allowed origins only.
- Add rate limiting & helmet middleware for security.

---

## 📄 License

Project currently unlicensed (ISC placeholder in backend). Choose a license (MIT / Apache-2.0) before external distribution.

---

## 🙌 Contributions / Customization

This codebase is modular: add new charts or modules by creating a component in `frontend/src/components` and wiring data from existing endpoints or new Express routes. PRs or suggestions to improve stability, performance, or security are welcome.

---

## 🧭 Summary

PharmStore delivers a foundation for pharmacy inventory + branch coordination, combining clear category analytics, responsive theming, and extensible backend models—ready to evolve into a full operational platform with sales, prescription tracking, and advanced analytics.

---

> Replace `<repo-url>` above with your repository URL after publishing.
