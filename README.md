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
│       ├── services/     # axios API service layer — product/category/promotion.service.ts
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
| `Supplier` | `suppliers` | external actor, no login account — contact info only |
| `PurchaseOrder` | `purchase_orders` | status ENUM(`pending`/`completed`/`cancelled`); `confirmedBy`/`confirmedAt` nullable until `confirmReceipt()` |
| `PurchaseOrderDetail` | `purchase_order_details` | `receivedQuantity` nullable until confirmed — actual received qty can differ from ordered qty |
| `StockTransfer` | `stock_transfers` | status ENUM(`pending`/`completed`); `confirmedBy`/`confirmedAt` nullable until `confirmTransfer()`; no `updatedAt` |

### Associations
- `User` N:1 `Store`
- `Product` N:1 `Category` (as `category`)
- `Inventory` N:1 `Store`, N:1 `Product`
- `Invoice` N:1 `Store`, N:1 `User` (as `staff`), N:1 `Customer` (as `customer`), N:1 `Promotion` (as `promotion`)
- `Invoice` 1:N `InvoiceDetail` (as `invoiceDetails`)
- `InvoiceDetail` N:1 `Invoice`, N:1 `Product` (as `product`)
- `Promotion` N:1 `Product` (nullable)
- `LoyaltyPoint` 1:1 `Customer`
- `Supplier` 1:N `PurchaseOrder`
- `Store` 1:N `PurchaseOrder`
- `PurchaseOrder` N:1 `User` (as `creator` for `createdBy`, as `confirmer` for `confirmedBy`)
- `PurchaseOrder` 1:N `PurchaseOrderDetail` (as `details`, `onDelete: CASCADE`)
- `PurchaseOrderDetail` N:1 `Product` (as `product`)
- `StockTransfer` N:1 `Store` (as `fromStore` / as `toStore`), N:1 `Product` (as `product`), N:1 `User` (as `creator` / as `confirmer`)

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
| `POST` | `/api/stores` | Manager | Create store |
| `PUT` | `/api/stores/:id` | Manager | Update store |
| `PATCH` | `/api/stores/:id/deactivate` | Manager | Soft delete (`isActive=false`) |
| `GET` | `/api/inventory?storeId=` | Auth | Stock levels for a store |
| `GET` | `/api/inventory/low-stock?storeId=` | Auth | Products under `lowStockThreshold` |
| `PATCH` | `/api/inventory` | WarehouseStaff | `{ storeId, productId, quantity, mode }` — manual stock adjustment |
| `GET` | `/api/products/search?q=` | Auth | Search active products by name/SKU (includes `category`) |
| `GET` | `/api/products` | Auth | List all products incl. inactive (management UI) |
| `POST` | `/api/products` | Manager | Create product |
| `PUT` | `/api/products/:id` | Manager | Update product |
| `DELETE` | `/api/products/:id` | Manager | Soft delete (`isActive=false`) |
| `GET` | `/api/categories` | Auth | List categories |
| `POST` | `/api/categories` | Manager | Create category |
| `PUT` | `/api/categories/:id` | Manager | Update category |
| `DELETE` | `/api/categories/:id` | Manager | Hard delete (`destroy()`) |
| `GET` | `/api/promotions` | Auth | List promotions |
| `POST` | `/api/promotions` | Manager | Create promotion |
| `PUT` | `/api/promotions/:id` | Manager | Update promotion (name/value/dates) |
| `PATCH` | `/api/promotions/:id/deactivate` | Manager | Soft-disable (`isActive=false`) |
| `GET` | `/api/loyalty-points/balance?customerId=` | Auth | Get loyalty point balance for a customer |
| `POST` | `/api/loyalty-points/redeem` | Auth | `{ customerId, amount }` — redeem points; 422 if balance insufficient |
| `GET` | `/api/suppliers` | Auth | List suppliers |
| `POST` | `/api/suppliers` | Manager | Create supplier |
| `GET` | `/api/purchase-orders` | Manager, WarehouseStaff | List purchase orders (filters: `storeId`, `status`, `startDate`, `endDate`; WarehouseStaff store-scoped) |
| `GET` | `/api/purchase-orders/:id` | Manager, WarehouseStaff | Purchase order detail incl. supplier/store/details |
| `POST` | `/api/purchase-orders` | Manager | Create purchase order `{ supplierId, storeId, items }` |
| `PUT` | `/api/purchase-orders/:id/confirm` | WarehouseStaff | `{ receivedItems }` — confirm receipt, increments inventory per item |
| `PUT` | `/api/purchase-orders/:id/cancel` | Manager | Cancel order (only if still `pending`) |
| `GET` | `/api/stock-transfers` | Auth | List stock transfers (filters: `storeId`, `status`) |
| `POST` | `/api/stock-transfers` | Manager | Create transfer `{ fromStoreId, toStoreId, productId, quantity }` |
| `PUT` | `/api/stock-transfers/:id/confirm` | WarehouseStaff | Confirm receipt at `toStoreId` — atomic: decrease `fromStore`, increase `toStore` |
| `GET` | `/api/customers?q=` | Staff, Manager | Search customers by name/phone (includes loyalty points) |
| `POST` | `/api/customers` | Staff, Manager | Create customer (also creates a `loyalty_points` row) |
| `POST` | `/api/invoices` | Staff | Start a new draft invoice for the cashier's store |
| `POST` | `/api/invoices/:id/items` | Staff | Add/update a cart line — upserts by `(invoiceId, productId)`; 422 if stock insufficient |
| `DELETE` | `/api/invoices/:id/items/:productId` | Staff | Remove a line from the draft invoice |
| `POST` | `/api/invoices/:id/promotion` | Staff | Apply a promotion code to the draft invoice |
| `POST` | `/api/invoices/:id/confirm-payment` | Staff | `{ paymentMethod, amount }` — finalize sale, decrement inventory, award loyalty points; 422 if amount is short |
| `GET` | `/api/invoices` | Staff, Manager | List invoices (filters: `startDate`, `endDate`, `search`; Manager only: `storeId`) |
| `GET` | `/api/reports/revenue?startDate=&endDate=` | Manager | Revenue summary + daily breakdown + top products |
| `GET` | `/api/reports/inventory?storeId=` | Manager | Inventory snapshot per store |

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
| `OrderHistory` | ✅ Connected | Staff "Lịch sử đơn hàng" — `GET /api/invoices` with date/search filters, detail modal, print |
| `ProductManagement` | ✅ Connected | Full CRUD via `services/product.service.ts` + `services/category.service.ts`; server-side search |
| `PromotionManagement` | ✅ Connected | List + create + update via `services/promotion.service.ts`; "Sửa" button active |
| `CustomerManagement` | ✅ Connected (partial) | List + create via `services/customer.service.ts`; "Sửa" disabled — `PUT /api/customers/:id` not yet implemented |
| `WarehouseManagement` | ✅ Connected | Tab **Tồn kho** → `GET /api/inventory`; tab **Đơn nhập hàng** → purchase-order endpoints; tab Điều chuyển hàng removed (replaced by `StockTransferManagement`) |
| `StockTransferManagement` | ✅ Connected | Create transfer (Manager) + confirm receipt (WarehouseStaff) via `services/stock-transfer.service.ts` |
| `StoreManagement` | ✅ Connected | Full CRUD via `services/store.service.ts` → `GET/POST/PUT /api/stores`, `PATCH /api/stores/:id/deactivate` |
| `RevenueReport` | ✅ Connected | Revenue + inventory reports via `reportApi.fetchRevenueReport` / `fetchInventoryReport` |
| `DashboardOverview` | 🔄 Partial mock | Low-stock + revenue chart fetch real API; `storesCount` and recent invoices still from mock data — see Pending below |

---

## Pending Implementation

**Backend:**
- `PUT /api/customers/:id` — update customer info; needed to activate the "Sửa" button in `CustomerManagement`
- `createProduct` trả `409` khi trùng `sku` thay vì `500` chung
- Filter `search` chưa hoạt động trong `PurchaseOrderService.getPurchaseOrders`

**Frontend:**
- `DashboardOverview`: fix API path `/api/report/revenue` → `/api/reports/revenue` in `reportApi.ts`; wire `storesCount` to `GET /api/stores`; wire recent invoices table to `GET /api/invoices` instead of mock data
