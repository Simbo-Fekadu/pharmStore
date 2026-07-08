# PharmStore

A full‑stack pharmacy inventory and branch management system built with **React 19 (Vite)** and **Node.js / Express / MongoDB**. Supports centralized medicine inventory, branch request workflows, supplier & branch administration, multi‑pharmacy tenant management, and rich dashboard insights.

---

## Architecture

```
pharmStore/
├── backend/                        # Express API server
│   ├── index.js                    # App bootstrap, middleware, route mounting
│   ├── db.js                       # MongoDB connection manager
│   ├── controllers/                # Route handlers (auth, inventory, medicine, …)
│   ├── services/                   # Business logic layer (stock.service, transfer.service, sale.service)
│   ├── models/                     # Mongoose schemas (Medicine, StockBalance, StockLedger, Request, …)
│   ├── routes/                     # Express routers
│   ├── middleware/                  # Authz, pharmacy scope
│   ├── utils/                      # Error handler, JWT verify
│   └── bootstrap/                  # Super admin + pharmacy seeding
├── frontend/                       # React SPA
│   ├── src/
│   │   ├── App.jsx                 # Route definitions
│   │   ├── main.jsx                # React root mount
│   │   ├── components/             # 42 single‑purpose components
│   │   ├── api/                    # base.js (API_BASE), authFetch.js (auth'd fetch)
│   │   ├── contexts/               # Toast + Confirm providers
│   │   ├── hooks/                  # useToast, useConfirm, usePharmacy
│   │   ├── utils/                  # number.js, medicine.js (shared helpers)
│   │   └── offline/                # IndexedDB cache + mutation queue
│   └── vite.config.js
├── docker-compose.yml
├── render.yaml
└── package.json                    # Root orchestration scripts
```

### Backend Layers

| Layer | Responsibility |
|---|---|
| **Routes** | Define endpoints, mount middleware (auth, scope) |
| **Controllers** | Parse request, delegate to services, shape response |
| **Services** | Business logic — ledger posting, transfers, sales creation, stock validation |
| **Models** | Mongoose schemas with indexes, virtuals, statics |
| **Middleware** | JWT verification, role checks, pharmacy context scoping |

### Frontend Component Hierarchy

```
<ThemeProvider>
  <ErrorBoundary>
    <ToastProvider>
      <ConfirmProvider>
        <Router>
          <Routes>
            /                         → Landing
            /signin                   → SignIn
            /admin                    → AdminLayout
              index                   → Dashboard        ← merged (admin + employee)
              medicines               → AdminMedicines
              medicines/add           → MedicineAdd      ← merged
              medicines/near-expiry   → MedicineExpiry   ← merged
              medicines/expired       → MedicineExpiry   ← merged
              ...
            /employee                 → EmployeeLayout
              index                   → Dashboard        ← same component
              medicines               → EmployeeMedicines
              medicines/add           → MedicineAdd      ← same component
              chat                    → Chat             ← merged (global + request)
              ...
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Lucide Icons, Vite 6 |
| Backend | Node.js, Express 5, MongoDB 8 (Mongoose) |
| Auth | JSON Web Tokens (JWT) with bcrypt password hashing |
| Desktop | Electron (optional) with bundled backend |
| Offline | IndexedDB cache + mutation queue with background sync |
| Tooling | ESLint (flat config), Docker Compose |

---

## Features

### Inventory & Medicines
- Full CRUD for medicines: name, brand, category, unit, batch number, expiry date, pricing, quantity, supplier linkage
- Stock balance tracking via `StockBalance` / `StockLedger` models with unit conversion
- Soft delete (trash) with recovery and permanent purge
- Auto-exclusion of expired items from active listings
- Category aggregation with distribution charts (bar + donut)
- Bulk CSV import and in-place editing (admin)
- Near-expiry (90 days) and expired views

### Branch Requests & Fulfillment
- Branches create inventory requests from central stock
- Admin approval / rejection with stock deduction on approval
- Per-request chat (admin ↔ branch) for clarifications
- Request lifecycle: Pending → Approved / Rejected

### Stock Transfers
- Distribute inventory from central store to branches
- Auto-posting to StockLedger with balanced debit/credit entries
- Complete audit trail per transfer

### Sales
- Point-of-sale interface (employee) with medicine search and quantity/price entry
- Auto-stock deduction on sale completion
- Sales history with date range, branch, and employee filters
- Daily sales log

### Multi-Pharmacy (Super Admin)
- Tenant management: create pharmacies, assign branches
- Super admin dashboard with aggregated metrics across all pharmacies
- Pharmacy-level filtering on medicines, users, transactions, requests
- Per-pharmacy users, branches, and inventory oversight

### Chat
- Global room chat (admin + employee)
- Per-request chat (embedded in request workflow)
- Messages persisted with sender handle and timestamps

### Dashboard & Analytics
- Metric cards: active medicines, near expiry, expired, trash counts
- Sales summary with date range picker
- Recent transactions table
- Category distribution (bar + donut charts)
- Price metrics (admin only): average prices, profit margin
- Super admin overview: pharmacy counts, user totals, system-wide metrics

### User Roles
| Role | Scope |
|---|---|
| `super_admin` | All pharmacies, full system access |
| `admin` | Single pharmacy, manage medicines/users/suppliers/branches/requests |
| `employee` | Single branch, limited stock, sales, requests |
| `inventory_manager` | Branch-level inventory operations |

### Theming
- Light / dark mode with CSS custom properties
- Customizable brand and accent colors
- Responsive: mobile sidebar → slide-in drawer
- Persistent theme preference via localStorage

---

## Workflows

### Medicine Lifecycle
```
Admin adds medicine ──→ Active Medicines list
       │                      │
       │                      ├── near expiry (90d) → MedicineExpiry view
       │                      ├── expired → MedicineExpiry view
       │                      └── soft delete → Trash (recover or purge)
       │
       └── Bulk CSV import (admin)
```

### Branch Request Workflow
```
Employee creates request ──→ AdminRequestCenter
       │                           │
       │                    ┌──────┴──────┐
       │                    │             │
       │                Approve       Reject
       │                    │             │
       │         Stock deducted      Status set
       │         Items dispatched     to rejected
       │
       └── Chat with admin for clarifications
```

### Stock Transfer Workflow
```
Central Store ──Transfer──→ Branch
       │                        │
   StockLedger              StockLedger
   (debit)                  (credit)
```

### Sale Workflow
```
Employee searches medicine
       │
   Sets quantity + price
       │
   Sale created ──→ StockLedger (debit)
       │              StockBalance (decrement)
   Daily log updated
```

---

## Project Structure (Detailed)

### Backend

```
backend/
├── index.js                     # Express setup, CORS, helmet, error handler, migration scripts
├── db.js                        # connectDB() — single persistent MongoDB connection
├── controllers/
│   ├── auth.controller.js       # signup, signin, signout, me
│   ├── inventory.controller.js  # CRUD, stock balance, ledger, transfers, requests
│   ├── medicine.controller.js   # Medicine CRUD, trash, restore, bulk import
│   ├── sale.controller.js       # Create sale, list sales, daily summary
│   ├── location.controller.js   # Branch & Store CRUD
│   ├── supplier.controller.js   # Supplier CRUD
│   ├── user.controller.js       # User CRUD, employee creation
│   ├── chat.controller.js       # Chat message list + post
│   ├── superadmin.controller.js # Multi-pharmacy overview, detail, management
│   └── export.controller.js     # CSV/Excel export endpoints
├── services/
│   ├── stock.service.js         # postLedgerEntry, getStockBalance, validateStock
│   ├── transfer.service.js      # transferStock (cross-location)
│   └── sale.service.js          # createSale with unit conversion + ledger posting
├── models/
│   ├── medicine.model.js
│   ├── inventory.model.js       # StockBalance + StockLedger schemas
│   ├── request.model.js
│   ├── sale.model.js
│   ├── user.model.js
│   ├── supplier.model.js
│   ├── branch.model.js
│   ├── store.model.js
│   ├── pharmacy.model.js
│   └── chat.model.js
├── routes/
│   ├── auth.route.js, medicine.route.js, inventory.route.js, …
│   └── sync.route.js            # Atlas sync endpoints (super admin only)
├── middleware/
│   ├── authz.js                 # requireSuperAdmin
│   └── pharmacyScope.js         # attachPharmacyContext
├── utils/
│   ├── error.js                 # errorHandler(statusCode, message)
│   └── verifyUser.js            # JWT verify middleware
└── bootstrap/
    ├── superadmin.js            # Auto-create super admin on startup
    └── pharmacy.js              # Default pharmacy + legacy backfill
```

### Frontend

```
frontend/src/
├── App.jsx                      # All routes → single Router
├── main.jsx                     # ReactDOM.createRoot
├── index.css                    # Tailwind + CSS variables (light/dark)
├── api/
│   ├── base.js                  # getApiBase(), API_BASE, isElectron()
│   └── authFetch.js             # Authenticated fetch wrapper
├── components/
│   ├── Dashboard.jsx            # Admin + employee dashboard (role-prop)
│   ├── AdminMedicines.jsx       # Medicine CRUD table with search/filter/export
│   ├── EmployeeMedicines.jsx    # Employee medicine list with request-stock modal
│   ├── MedicineAdd.jsx          # Add medicine form (admin=full, employee=simplified)
│   ├── MedicineExpiry.jsx       # Near-expiry & expired view (type prop)
│   ├── AdminInventory.jsx       # Store inventory with receive + distribute modals
│   ├── AdminRequestCenter.jsx   # Incoming requests with approve/reject
│   ├── BranchRequest.jsx        # Employee request creation
│   ├── Fulfillment.jsx          # Request status tracking (employee)
│   ├── Chat.jsx                 # Global + per-request chat (requestId prop)
│   ├── AdminUsers.jsx           # User management
│   ├── AdminSuppliers.jsx       # Supplier management
│   ├── AdminBranches.jsx        # Branch management
│   ├── AdminSales.jsx           # Sales reports
│   ├── EmployeeSales.jsx        # Point-of-sale interface
│   ├── EmployeeSalesHistory.jsx # Branch sales history
│   ├── EmployeeAddStock.jsx     # Self-service stock addition
│   ├── AdminTransactions.jsx    # Ledger entry log
│   ├── AdminMedicineTrash.jsx   # Soft-delete recovery + purge
│   ├── AdminActiveMedicines.jsx # Active (non-expired) medicines list
│   ├── BranchMedicines.jsx      # Branch read-only medicine view
│   ├── SuperAdminDashboard.jsx  # Multi-tenant metrics
│   ├── SuperAdminPharmacies.jsx # Pharmacy CRUD
│   ├── SuperAdminBranches.jsx   # All branches across pharmacies
│   ├── SuperAdminPharmacyDetail.jsx # Full pharmacy detail (8 tabs)
│   ├── SuperAdminBranchDetail.jsx   # Branch detail
│   ├── ExportCenter.jsx         # Data export (xlsx/pdf)
│   ├── AdminLayout.jsx          # Admin sidebar layout
│   ├── EmployeeLayout.jsx       # Employee sidebar layout
│   ├── Landing.jsx              # Marketing landing page
│   ├── SignIn.jsx / SignUp.jsx  # Auth forms
│   ├── Home.jsx                 # Legacy simple dashboard
│   ├── InventoryForm.jsx        # Standalone inventory upsert form
│   ├── InventoryPage.jsx        # Inventory form + stats page
│   ├── ThemeProvider.jsx        # Light/dark theme context
│   ├── ToastProvider.jsx        # Toast notification system
│   ├── ConfirmProvider.jsx      # Confirmation modal
│   └── ErrorBoundary.jsx        # React error boundary
├── hooks/
│   ├── useToast.js              # Toast context consumer
│   ├── useConfirm.js            # Confirm context consumer
│   └── usePharmacy.js           # Pharmacy loader for super admin
├── utils/
│   ├── number.js                # ceilNumber, ceilCurrency, ceilOrDash
│   └── medicine.js              # sortByRecent, formatBirr, sellingValue, displayQuantity
├── contexts/
│   ├── ToastContext.js
│   └── ConfirmContext.js
└── offline/
    ├── db.js                    # IndexedDB open/withStore
    ├── cache.js                 # Read-model caching
    ├── queue.js                 # Mutation queue
    └── sync.js                  # Online/focus sync trigger
```

---

## Setup

### Prerequisites
- Node.js 18+
- MongoDB running locally or a remote URI

### 1. Clone & Install
```bash
git clone <repo-url>
cd pharmStore
npm install                    # Root (orchestration scripts, if any)
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Backend
Create `backend/.env`:
```
PORT=3000
MONGO_URI=mongodb://localhost:27017/pharmstore
SECRET=a_strong_random_secret
SUPERADMIN_EMAIL=admin@pharmstore.com
SUPERADMIN_PASSWORD=your_password
```

### 3. Start Development
```bash
# Terminal 1 — Backend API
cd backend && npm start

# Terminal 2 — Frontend dev server
cd frontend && npm run dev
```

Open http://localhost:5173.

---

## API Overview

All endpoints are prefixed with `/backend/`.

| Endpoint Group | Auth | Description |
|---|---|---|
| `POST /auth/signup` | Public | Register new user |
| `POST /auth/signin` | Public | Login → JWT token |
| `POST /auth/signout` | Auth | Clear session |
| `GET /auth/me` | Auth | Current user info |
| `GET/POST /medicine` | Auth | List / create medicines |
| `GET/POST /inventory/*` | Auth | Stock balance, ledger, transfers, requests |
| `GET/POST /sales/*` | Auth | Sales CRUD + history |
| `GET/POST /location/*` | Auth | Branch / Store CRUD |
| `GET/POST /supplier` | Auth | Supplier CRUD |
| `GET/POST /user` | Auth | User management |
| `GET/POST /chat` | Auth | Chat messages |
| `GET/POST /superadmin/*` | Super Admin | Multi-pharmacy management |
| `POST /atlas/run` | Super Admin | Trigger Atlas sync |

---

## Deployment

### Docker
```bash
docker-compose up -d
```

### Render (render.yaml)
Push to a Render-connected GitHub repo; `render.yaml` auto-configures the web service.

### Manual
- Build frontend: `cd frontend && npm run build`
- Serve `frontend/dist/` from Express or a reverse proxy (Nginx / Caddy)
- Run backend with a process manager (PM2, systemd)
- Set environment secrets and restrict CORS origins in production
