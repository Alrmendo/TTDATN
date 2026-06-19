# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTDATN is a retail chain management system (Vietnamese: Tổ chức Bán lẻ Chuỗi) with a Node.js/Express/TypeScript backend and a React/Vite/TypeScript frontend. The frontend components are being migrated from mock data to real API calls one by one. Auth, Account management, Inventory, and the Sales/POS flow (orders, customers, promotions, loyalty points) are fully implemented end-to-end (backend + frontend). Most other modules (Products CRUD, Warehouse, Promotions UI, Stores, Dashboard, Reports) still use mock data on the frontend and/or have no backend routes yet.

## Commands

### Backend (`cd backend`)
```bash
npm run dev      # Start dev server with nodemon (port 5000)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled dist/
npm run seed     # Seed database with test data (idempotent — safe to re-run)
```

### Frontend (`cd frontend`)
```bash
npm run dev      # Start Vite dev server (port 3000, HMR enabled)
npm run build    # Production build
npm run lint     # TypeScript type check (no test suite exists)
npm run clean    # Remove dist/ and build artifacts
```

### Prerequisites
- PostgreSQL running on `localhost:5432` with database `ttdatn_db`
- Copy `.env.example` to `.env` in both `backend/` and `frontend/` before running

## Architecture

### Backend (`backend/src/`)
Layered architecture:

- `server.ts` — Express entry point; mounts `/api/auth`, `/api/accounts`, `/api/stores`, `/api/inventory`, `/api/invoices`, `/api/customers`, `/api/products`
- `config/database.ts` — Sequelize + PostgreSQL connection (syncs with `alter: true`)
- `types/express.d.ts` — Declaration merging for `req.user` on Express Request; `ts-node` requires `"files": true` in `tsconfig.json` to pick this up

**Models implemented (`models/`):**
| Model file | Table | Notes |
|---|---|---|
| `user.model.ts` | `users` | role ENUM, bcrypt passwordHash, isActive |
| `store.model.ts` | `stores` | isActive for soft delete |
| `category.model.ts` | `categories` | FK target for products |
| `product.model.ts` | `products` | sku UNIQUE, no quantity column — stock in inventory |
| `inventory.model.ts` | `inventory` | UNIQUE(storeId,productId); `adjustQuantity(delta)` instance method throws if stock goes negative; FK `references` on storeId/productId |
| `customer.model.ts` | `customers` | phone UNIQUE; no updatedAt |
| `invoice.model.ts` | `invoices` | `promotionId` is a nullable FK → `promotions.id` |
| `invoice-detail.model.ts` | `invoice_details` | no timestamps; one row per product per invoice — `OrderService.addItem` upserts by `(invoiceId, productId)`, never inserts a duplicate line for the same product |
| `promotion.model.ts` | `promotions` | `type` ENUM('percentage','fixed'); nullable `productId` FK (NULL = whole-order promo); `isValid(orderValue)` and `calculateDiscount(amount)` instance methods |
| `loyalty-point.model.ts` | `loyalty_points` | `customerId` NOT NULL + UNIQUE FK → `customers.id` (1:1); no `createdAt` |

**Missing models (not yet created):**
- `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`

**Associations (`models/index.ts`)** — note the explicit `as` aliases; controllers must use these exact aliases in `include:` or the JSON response keys won't match what the frontend types expect:
- `User` ↔ `Store` (N:1)
- `Product` ↔ `Category` (N:1, as `category`)
- `Inventory` ↔ `Store`, `Inventory` ↔ `Product` (N:1 each)
- `Invoice` ↔ `Store`, `Invoice` ↔ `User` (as `staff`), `Invoice` ↔ `Customer` (as `customer`, nullable), `Invoice` ↔ `Promotion` (as `promotion`, nullable)
- `Invoice` ↔ `InvoiceDetail` (1:N, as `invoiceDetails`), `InvoiceDetail` ↔ `Product` (N:1, as `product`)
- `Promotion` ↔ `Product` (N:1, nullable)
- `LoyaltyPoint` ↔ `Customer` (1:1, via `Customer.hasOne`)

**Controllers implemented (`controllers/`):**
- `auth.controller.ts` — login (bcrypt verify → JWT sign)
- `account.controller.ts` — list, create, update accounts (Manager only)
- `store.controller.ts` — list active stores
- `inventoryController.ts` — get by store, low-stock list, update (increase/decrease)
- `product.controller.ts` — `searchProducts` (active products only, ILIKE on name/sku, includes `category`) — this is the **only** Products endpoint; no full CRUD yet
- `customer.controller.ts` — `searchCustomers` (ILIKE on fullName/phone, includes `loyaltyPoints`), `createCustomer` (409 on duplicate phone, also creates a `loyalty_points` row)
- `order.controller.ts` — `createOrder`, `addItem` (422 on `'Tồn kho không đủ'`), `removeItem`, `applyPromotion`, `confirmPayment` (422 on `'Số tiền không đủ'`), `getInvoices` (role-scoped: Staff forced to own store, Manager optional `storeId`; supports `startDate`/`endDate`/`search`)

**Middleware implemented (`middleware/`):**
- `auth.middleware.ts` — verifies Bearer JWT, attaches `req.user`
- `role.middleware.ts` — `roleMiddleware(allowedRoles[])` factory

**Routes implemented (`routes/`):**
- `auth.routes.ts` → `POST /api/auth/login`
- `account.routes.ts` → `GET /api/accounts`, `POST /api/accounts`, `PUT /api/accounts/:id`
- `store.routes.ts` → `GET /api/stores`
- `inventory.routes.ts` → `GET /api/inventory`, `GET /api/inventory/low-stock`, `PATCH /api/inventory` (WarehouseStaff only)
- `product.routes.ts` → `GET /api/products/search`
- `customer.routes.ts` → `GET /api/customers`, `POST /api/customers` (Staff, Manager)
- `order.routes.ts` → `POST /api/invoices`, `POST /api/invoices/:id/items`, `DELETE /api/invoices/:id/items/:productId`, `POST /api/invoices/:id/promotion`, `POST /api/invoices/:id/confirm-payment` (all Staff only), `GET /api/invoices` (Staff, Manager)

**Services implemented (`services/`):**
- `InventoryService.ts` — `updateInventory(storeId, productId, quantity, mode)`, `checkLowStock(storeId?)`, `getStockByStore(storeId)`, `checkStock(...)`
- `OrderService.ts` — `createOrder`, `addItem` (upserts by productId, throws `'Tồn kho không đủ'` via `InventoryService.checkStock`), `removeItem`, `applyPromotion` (no-op discount=0 + 200 response if `Promotion.isValid()` fails — **not** an HTTP error), `confirmPayment` (throws `'Số tiền không đủ'` if `amount < totalAmount`, decrements inventory per line, awards `floor(totalAmount / 10000)` loyalty points if `customerId` is set)
- `LoyaltyPointService.ts` — `addPoints`, `redeemPoints` (returns `false` without mutating if balance insufficient), `getBalance`

**Known gap:** `OrderService.applyPromotion` is never re-validated when cart contents change after a promotion was applied — the backend doesn't clear `discountAmount` server-side on `addItem`/`removeItem`. The frontend (`SalesManagement.tsx`) clears its own local discount state on cart edits as a client-side mitigation, but there's no equivalent guard on the backend if some other client calls these endpoints directly.

### Frontend (`frontend/src/`)
All application state lives in `App.tsx` via React hooks — no Redux or Context. Feature components are passed state and callbacks as props.
- `App.tsx` — Root component; owns all state, routing logic, login/role gating; session persisted in `localStorage`
- `types.ts` — All shared TypeScript interfaces; includes `ApiAccount`, `ApiStore`, `AuthUser`, `ApiCustomer`, `ApiPromotion`, `ApiInvoice`, `ApiInvoiceDetail`, `ApiProduct` (the original mock-shaped `Product`/`Customer`/`Promotion`/`Invoice` interfaces still exist too — kept only so unmigrated components and unused prop signatures still compile, do not use them for new API-backed work)
- `utils/roleMapping.ts` — `roleLabels` (enum → Vietnamese), `roleLabelToEnum` (Vietnamese → enum), `defaultTabByRole`
- `data.ts` — Mock data still used by components not yet migrated
- `components/` — One file per business domain

**Components connected to real API:**
- `AccountManagement.tsx` — fetches `GET /api/accounts` + `GET /api/stores`; POST create, PUT edit/toggle
- `SalesManagement.tsx` — full POS flow against `/api/invoices`, `/api/products/search`, `/api/customers`. Receives the old mock props (`products`, `customers`, `promotions`, `onAddInvoice`, etc.) to keep `App.tsx` unchanged, but destructures them with `_` prefixes and never reads them — everything is fetched fresh. Starts a new draft invoice on mount (`POST /api/invoices`); add/quantity-change both funnel through one `submitItem` helper that calls `POST /api/invoices/:id/items` (upsert); editing the cart after a promotion was applied clears the local discount and requires manual re-apply.
- `OrderHistory.tsx` — Staff "Lịch sử đơn hàng" tab; `GET /api/invoices` with `startDate`/`endDate`/`search`; today's order count/revenue computed client-side from the fetched list (no extra request); detail modal + `window.print()`-based invoice printing. Replaced `ReportView` for this tab.

**Components still using mock data (not yet migrated):**
- `ProductManagement`, `WarehouseManagement`, `CustomerManagement`, `PromotionManagement`, `StoreManagement`, `DashboardOverview`, `EmployeeManagement`, `RevenueReport` — `ProductManagement`/`WarehouseManagement`/`CustomerManagement` have a usable backend API now (`/api/products/search`, `/api/inventory`, `/api/customers`) but aren't wired up yet
- `ReportView` — still exists on disk but is **no longer rendered anywhere** in `App.tsx` (superseded by `OrderHistory`); don't assume it's reachable

### Login credentials
Real (seeded in DB — use these when backend is running):
- Manager: `manager@test.com` / `password123`

Mock-only (frontend only, no backend account exists):
- Sales Staff: `staff@retailchain.vn` / `123456`
- Warehouse Staff: `warehouse@retailchain.vn` / `123456`

### Seeded data (after `npm run seed`)
- 1 Manager user (`manager@test.com`)
- 3 stores: Chi nhánh Quận 1, Quận 7, Bình Thạnh
- 1 category: Đồ uống
- 3 products: SP001 Coca Cola, SP002 Bánh mì sandwich, SP003 Nước suối Lavie
- Inventory: 100 units of each product at Chi nhánh Quận 1
- 1 customer: Lê Thị Khách (0909999999)

## Database Schema

Full schema with design rationale is in `Schema.md`. Key decisions:

- **UUID string primary keys** throughout all tables
- **Single `users` table** with `role` enum (`Manager` | `Staff` | `WarehouseStaff`) — no inheritance tables
- **`isActive` boolean** for soft deletes on users, products, stores, promotions
- **`Inventory` model** has an `adjustQuantity(delta)` instance method; a shared `InventoryService.updateInventory(storeId, productId, quantity, mode)` is the intended entry point for all stock changes — do NOT create per-module variants
- **Payment info** is embedded in `invoices` (no separate Payment table)
- **`loyalty_points`** is a one-to-one extension of `customers`

14 tables: `users`, `stores`, `categories`, `products`, `inventory`, `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`, `customers`, `loyalty_points`, `promotions`, `invoices`, `invoice_details`

## TypeScript notes

- Express 5 types `req.params` values as `string | string[]` — always cast: `const id = req.params.id as string`
- `req.user` requires `"ts-node": { "files": true }` in `tsconfig.json` to load `types/express.d.ts`
- Controller pattern: `async (req: Request, res: Response): Promise<void>`, `return;` after every `res.json()`, `catch { }` without binding
- Use `attributes: { exclude: ['passwordHash'] }` when returning user data
- DECIMAL columns come back as strings from Sequelize/PostgreSQL — parse with `parseFloat()` if doing arithmetic

## Git Workflow

Commit work to Git after every meaningful unit of progress (a model implemented, a route wired up, a bug fixed). Never batch unrelated changes into one commit.

**Branches:** feature work happens on per-module branches off `main` (e.g. `Auth`, `Tồn-kho`, `Bán-hàng`), merged via PR. Check `git branch` / `git status` for which branch is currently checked out before committing — do not assume `Auth` is current.

**Commit format:**
```
type: short imperative description (under 72 chars)
```
Use types: `feat`, `fix`, `refactor`, `docs`, `chore`. Examples:
- `feat: add Product and Category Sequelize models`
- `fix: correct JWT expiry handling in auth middleware`
- `chore: install bcrypt and jsonwebtoken dependencies`

**Push only when the user explicitly asks.**

Always stage specific files — never `git add -A`:
```bash
git add backend/src/models/product.model.ts
git commit -m "feat: add Product Sequelize model"
git push origin Auth   # only when user says to push
```

## What Still Needs to Be Built

**Backend — high priority:**
1. Full Products CRUD (create/update/delete + category management) — only `GET /api/products/search` exists today
2. Promotion management routes (create/update/deactivate a promotion) and Loyalty Point routes (redeem/check balance) — the service methods (`LoyaltyPointService.redeemPoints`/`getBalance`, plus `Promotion` itself) already exist, just no HTTP surface
3. Missing models: `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`
4. Server-side guard to clear/re-validate `discountAmount` when invoice items change after a promotion was applied (see "Known gap" above)

**Frontend — migration from mock data:**
- Replace `data.ts` mock calls in each component with real `fetch()` to the backend APIs, following the same pattern as `AccountManagement.tsx`/`SalesManagement.tsx`
- `WarehouseManagement` and `CustomerManagement` are the natural next targets — their backend APIs (`/api/inventory`, `/api/customers`) already exist, they're just not wired up in those components yet
- `ProductManagement`, `PromotionManagement`, `StoreManagement`, `DashboardOverview`, `EmployeeManagement`, `RevenueReport` still need both backend routes and frontend wiring
