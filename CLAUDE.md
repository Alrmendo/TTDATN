# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTDATN is a retail chain management system (Vietnamese: Tổ chức Bán lẻ Chuỗi) with a Node.js/Express/TypeScript backend and a React/Vite/TypeScript frontend. The frontend components are being migrated from mock data to real API calls one by one. The backend auth layer is complete; Sales module models exist but routes/services are not yet implemented.

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
Layered architecture — auth and account management are fully implemented:

- `server.ts` — Express entry point; mounts `/api/auth`, `/api/accounts`, `/api/stores`
- `config/database.ts` — Sequelize + PostgreSQL connection (syncs with `alter: true`)
- `types/express.d.ts` — Declaration merging for `req.user` on Express Request; `ts-node` requires `"files": true` in `tsconfig.json` to pick this up

**Models implemented (`models/`):**
| Model file | Table | Notes |
|---|---|---|
| `user.model.ts` | `users` | role ENUM, bcrypt passwordHash, isActive |
| `store.model.ts` | `stores` | isActive for soft delete |
| `category.model.ts` | `categories` | FK target for products |
| `product.model.ts` | `products` | sku UNIQUE, no quantity column — stock in inventory |
| `inventory.model.ts` | `inventory` | UNIQUE(storeId,productId); `adjustQuantity(delta)` instance method throws if stock goes negative |
| `customer.model.ts` | `customers` | phone UNIQUE; no updatedAt |
| `invoice.model.ts` | `invoices` | promotionId is plain UUID (no FK) — Promotion model not yet created |
| `invoice-detail.model.ts` | `invoice_details` | no timestamps |

**Missing models (not yet created):**
- `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`, `loyalty_points`, `promotions`

**Controllers implemented (`controllers/`):**
- `auth.controller.ts` — login (bcrypt verify → JWT sign)
- `account.controller.ts` — list, create, update accounts (Manager only)
- `store.controller.ts` — list active stores

**Middleware implemented (`middleware/`):**
- `auth.middleware.ts` — verifies Bearer JWT, attaches `req.user`
- `role.middleware.ts` — `roleMiddleware(allowedRoles[])` factory

**Routes implemented (`routes/`):**
- `auth.routes.ts` → `POST /api/auth/login`
- `account.routes.ts` → `GET /api/accounts`, `POST /api/accounts`, `PUT /api/accounts/:id`
- `store.routes.ts` → `GET /api/stores`

**Nothing implemented yet in `services/`** — all business logic is currently inline in controllers.

### Frontend (`frontend/src/`)
All application state lives in `App.tsx` via React hooks — no Redux or Context. Feature components are passed state and callbacks as props.
- `App.tsx` — Root component; owns all state, routing logic, login/role gating; session persisted in `localStorage`
- `types.ts` — All shared TypeScript interfaces; includes `ApiAccount`, `ApiStore`, `AuthUser`
- `utils/roleMapping.ts` — `roleLabels` (enum → Vietnamese), `roleLabelToEnum` (Vietnamese → enum), `defaultTabByRole`
- `data.ts` — Mock data still used by components not yet migrated
- `components/` — One file per business domain

**Components connected to real API:**
- `AccountManagement.tsx` — fetches `GET /api/accounts` + `GET /api/stores`; POST create, PUT edit/toggle

**Components still using mock data (not yet migrated):**
- `ProductManagement`, `SalesManagement`, `WarehouseManagement`, `CustomerManagement`, `ReportView`, `PromotionManagement`, `StoreManagement`, `DashboardOverview`

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
- **`promotionId` on invoices** is a plain UUID column with no FK constraint until the `promotions` model is created
- **`loyalty_points`** is a one-to-one extension of `customers` (not yet implemented)

14 tables: `users`, `stores`, `categories`, `products`, `inventory`, `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`, `customers`, `loyalty_points`, `promotions`, `invoices`, `invoice_details`

## TypeScript notes

- Express 5 types `req.params` values as `string | string[]` — always cast: `const id = req.params.id as string`
- `req.user` requires `"ts-node": { "files": true }` in `tsconfig.json` to load `types/express.d.ts`
- Controller pattern: `async (req: Request, res: Response): Promise<void>`, `return;` after every `res.json()`, `catch { }` without binding
- Use `attributes: { exclude: ['passwordHash'] }` when returning user data
- DECIMAL columns come back as strings from Sequelize/PostgreSQL — parse with `parseFloat()` if doing arithmetic

## Git Workflow

Commit work to Git after every meaningful unit of progress (a model implemented, a route wired up, a bug fixed). Never batch unrelated changes into one commit.

**Current branch: `Auth`** — all work goes here until merged to `main`.

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
1. `services/InventoryService.ts` — `updateInventory(storeId, productId, quantity, mode)` shared by Sales + Warehouse + Transfers
2. `services/OrderService.ts` — createOrder, addItem, applyPromotion, confirmPayment
3. Routes + controllers for: Products, Inventory, Customers, Sales (invoices)
4. Missing models: `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`, `loyalty_points`, `promotions`
5. Wire `promotionId` FK association in `models/index.ts` once `promotions` model exists

**Frontend — migration from mock data:**
- Replace `data.ts` mock calls in each component with real `fetch()` to the backend APIs, following the same pattern as `AccountManagement.tsx`
