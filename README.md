# TTDATN — Retail Chain Management System

Hệ thống quản lý chuỗi bán lẻ (Tổ Chức Bán Lẻ Chuỗi) — Node.js/Express/TypeScript backend + React/Vite/TypeScript frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5, TypeScript, Sequelize 6 |
| Database | PostgreSQL |
| Auth | JWT (jsonwebtoken), bcrypt |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |

---

## Project Structure

```
TTDATN/
├── backend/          # Express API server (port 5000)
│   └── src/
│       ├── config/       # Sequelize + PostgreSQL connection
│       ├── models/       # Sequelize models
│       ├── controllers/  # Route handlers
│       ├── services/     # Business logic — InventoryService, OrderService, LoyaltyPointService
│       ├── middleware/   # JWT auth + role guard
│       ├── routes/       # Express routers
│       ├── types/        # express.d.ts — extends req.user
│       └── seed.ts       # Database seeder
├── frontend/         # React/Vite SPA (port 3000)
│   └── src/
│       ├── components/   # One file per business domain
│       ├── utils/        # roleMapping helpers
│       ├── types.ts      # Shared TypeScript interfaces
│       └── data.ts       # Mock data (used by non-migrated components)
└── Schema.md         # Single source of truth for database schema
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL running on `localhost:5432`
- Database `ttdatn_db` created

### 1. Backend setup
```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL and JWT_SECRET
npm install
npm run seed                  # seed test data (idempotent)
npm run dev                   # starts on port 5000
```

### 2. Frontend setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # starts on port 3000
```

### 3. Login
| Role | Email | Password |
|---|---|---|
| Manager | `manager@test.com` | `password123` |

---

## Implemented — Backend

### Models (Sequelize + PostgreSQL)

| Model | Table | Key details |
|---|---|---|
| `User` | `users` | ENUM role (`Manager`/`Staff`/`WarehouseStaff`), bcrypt password, `isActive` soft-delete |
| `Store` | `stores` | `isActive` soft-delete |
| `Category` | `categories` | FK target for products |
| `Product` | `products` | `sku` UNIQUE; **no `quantity` column** — stock lives in `inventory` |
| `Inventory` | `inventory` | UNIQUE(`storeId`, `productId`); `adjustQuantity(delta)` instance method with negative-stock guard |
| `Customer` | `customers` | `phone` UNIQUE |
| `Invoice` | `invoices` | status ENUM (`draft`/`completed`/`cancelled`); payment info embedded; `promotionId` is a nullable FK → `promotions.id` |
| `InvoiceDetail` | `invoice_details` | price snapshot at time of sale; one row per product per invoice (upserted by `OrderService.addItem`) |
| `Promotion` | `promotions` | `type` ENUM(`percentage`/`fixed`); nullable `productId` FK (NULL = whole-order promo); `isValid(orderValue)` / `calculateDiscount(amount)` instance methods |
| `LoyaltyPoint` | `loyalty_points` | 1:1 with `Customer` via UNIQUE `customerId` FK; no `createdAt` |

### Associations
- `User` N:1 `Store`
- `Product` N:1 `Category` (as `category`)
- `Inventory` N:1 `Store`, N:1 `Product`
- `Invoice` N:1 `Store`, N:1 `User` (as `staff`), N:1 `Customer` (as `customer`), N:1 `Promotion` (as `promotion`)
- `Invoice` 1:N `InvoiceDetail` (as `invoiceDetails`)
- `InvoiceDetail` N:1 `Invoice`, N:1 `Product` (as `product`)
- `Promotion` N:1 `Product` (nullable)
- `LoyaltyPoint` 1:1 `Customer`

### Middleware
- `authMiddleware` — verifies Bearer JWT, attaches `req.user: { userId, role, storeId }`
- `roleMiddleware(allowedRoles[])` — guards routes by role

### API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Email + password → JWT token |
| `GET` | `/api/accounts` | Manager | List all user accounts (search + filter) |
| `POST` | `/api/accounts` | Manager | Create new user account |
| `PUT` | `/api/accounts/:id` | Manager | Update account (name, store, salary, isActive) |
| `GET` | `/api/stores` | Auth | List active stores |
| `GET` | `/api/inventory?storeId=` | Auth | Stock levels for a store |
| `GET` | `/api/inventory/low-stock?storeId=` | Auth | Products under `lowStockThreshold` |
| `PATCH` | `/api/inventory` | WarehouseStaff | `{ storeId, productId, quantity, mode }` — manual stock adjustment |
| `GET` | `/api/products/search?q=` | Auth | Search active products by name/SKU |
| `GET` | `/api/customers?q=` | Staff, Manager | Search customers by name/phone (includes loyalty points) |
| `POST` | `/api/customers` | Staff, Manager | Create customer (also creates a `loyalty_points` row) |
| `POST` | `/api/invoices` | Staff | Start a new draft invoice for the cashier's store |
| `POST` | `/api/invoices/:id/items` | Staff | Add/update a cart line — upserts by `(invoiceId, productId)`; 422 if stock insufficient |
| `DELETE` | `/api/invoices/:id/items/:productId` | Staff | Remove a line from the draft invoice |
| `POST` | `/api/invoices/:id/promotion` | Staff | Apply a promotion code to the draft invoice |
| `POST` | `/api/invoices/:id/confirm-payment` | Staff | `{ paymentMethod, amount }` — finalize sale, decrement inventory, award loyalty points; 422 if amount is short |
| `GET` | `/api/invoices` | Staff, Manager | List invoices (filters: `startDate`, `endDate`, `search`; Manager only: `storeId`) |

### Seeded Data (`npm run seed`)
- 1 Manager: `manager@test.com` / `password123`
- 3 Stores: Chi nhánh Quận 1, Quận 7, Bình Thạnh
- 1 Category: Đồ uống
- 3 Products: SP001 Coca Cola 330ml, SP002 Bánh mì sandwich, SP003 Nước suối Lavie 500ml
- Inventory: 100 units × 3 products at Chi nhánh Quận 1
- 1 Customer: Lê Thị Khách (0909999999)

---

## Implemented — Frontend

| Component | Status | Notes |
|---|---|---|
| Login screen | ✅ Connected | Calls `POST /api/auth/login`; stores JWT in localStorage |
| `AccountManagement` | ✅ Connected | Fetches accounts + stores; create/edit/toggle via API |
| `SalesManagement` | ✅ Connected | Full POS flow against `/api/invoices`, `/api/products/search`, `/api/customers` |
| `OrderHistory` | ✅ Connected | Staff "Lịch sử đơn hàng" tab — `GET /api/invoices` with date/search filters, detail modal, print |
| `ProductManagement` | 🔄 Mock data | Pending backend CRUD routes (search-only endpoint exists) |
| `WarehouseManagement` | 🔄 Mock data | Inventory API exists (`/api/inventory`) but not yet wired into this component |
| `CustomerManagement` | 🔄 Mock data | Customer search/create API exists but not yet wired into this component |
| `PromotionManagement` | 🔄 Mock data | Pending backend routes |
| `StoreManagement` | 🔄 Mock data | Pending backend routes |
| `DashboardOverview` | 🔄 Mock data | Pending backend routes |
| `ReportView` | 🔄 Mock data, unused | Superseded by `OrderHistory` for Staff; no longer rendered anywhere |
| `EmployeeManagement` | 🔄 Mock data | Pending backend routes |
| `RevenueReport` | 🔄 Mock data | Pending backend routes |

---

## Pending Implementation

**Backend:**
- Full Products CRUD (currently only `GET /api/products/search` exists)
- Missing models: `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`
- Promotion/loyalty management endpoints (create/update promotions; redeem/check loyalty balance — service methods exist, no routes yet)

**Frontend:**
- Migrate remaining mock-data components (`ProductManagement`, `WarehouseManagement`, `CustomerManagement`, `PromotionManagement`, `StoreManagement`, `DashboardOverview`, `EmployeeManagement`, `RevenueReport`) to real API calls
- Re-validate/clear an applied promotion server-side when cart contents change after the discount was applied (frontend already clears its own local discount state on cart edits, but there's no equivalent server-side guard)
