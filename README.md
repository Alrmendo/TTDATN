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
│       ├── services/     # Business logic (pending)
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
| `Invoice` | `invoices` | status ENUM (`draft`/`completed`/`cancelled`), payment info embedded; `promotionId` is plain UUID pending `promotions` model |
| `InvoiceDetail` | `invoice_details` | price snapshot at time of sale |

### Associations
- `User` N:1 `Store`
- `Product` N:1 `Category`
- `Inventory` N:1 `Store`, N:1 `Product`
- `Invoice` N:1 `Store`, N:1 `User` (as `staff`), N:1 `Customer`
- `InvoiceDetail` N:1 `Invoice`, N:1 `Product`

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
| `ProductManagement` | 🔄 Mock data | Pending backend routes |
| `SalesManagement` | 🔄 Mock data | Pending backend routes |
| `WarehouseManagement` | 🔄 Mock data | Pending backend routes |
| `CustomerManagement` | 🔄 Mock data | Pending backend routes |
| `PromotionManagement` | 🔄 Mock data | Pending backend routes |
| `StoreManagement` | 🔄 Mock data | Pending backend routes |
| `DashboardOverview` | 🔄 Mock data | Pending backend routes |
| `ReportView` | 🔄 Mock data | Pending backend routes |

---

## Pending Implementation

**Backend:**
- `InventoryService.updateInventory(storeId, productId, quantity, mode)` — shared entry point for all stock changes
- `OrderService` — createOrder, addItem, applyPromotion, confirmPayment
- Routes + controllers: Products, Inventory, Customers, Invoices
- Missing models: `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`, `loyalty_points`, `promotions`

**Frontend:**
- Migrate remaining components from mock data to real API calls
