# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTDATN is a retail chain management system (Vietnamese: Tổ chức Bán lẻ Chuỗi) with a Node.js/Express/TypeScript backend and a React/Vite/TypeScript frontend. The frontend is fully functional with mock data; the backend is a skeleton pending full implementation.

## Commands

### Backend (`cd backend`)
```bash
npm run dev      # Start dev server with nodemon (port 5000)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled dist/
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
Layered architecture — currently only the config and User model are implemented:
- `server.ts` — Express entry point; route imports are commented out pending implementation
- `config/database.ts` — Sequelize + PostgreSQL connection (syncs with `alter: true`)
- `models/` — Sequelize models (only `User.model.ts` exists; all others need to be created)
- `controllers/`, `services/`, `middleware/`, `routes/` — directories exist but are empty

### Frontend (`frontend/src/`)
All application state lives in `App.tsx` via React hooks — no Redux or Context. Feature components are passed state and callbacks as props.
- `App.tsx` — Root component; owns all state, routing logic, and login/role gating
- `types.ts` — All shared TypeScript interfaces
- `data.ts` — Mock data used until backend APIs are wired up
- `components/` — One file per business domain (ProductManagement, SalesManagement, WarehouseManagement, etc.)

Demo login credentials (mock only):
- Manager: `manager@retailchain.vn` / `123456`
- Sales Staff: `staff@retailchain.vn` / `123456`
- Warehouse Staff: `warehouse@retailchain.vn` / `123456`

## Database Schema

Full schema with design rationale is in `Schema.md`. Key decisions:

- **UUID string primary keys** throughout all tables
- **Single `users` table** with `role` enum (`Manager` | `SalesStaff` | `WarehouseStaff`) — no inheritance tables
- **`isActive` boolean** for soft deletes on users, products, stores, promotions
- **`Inventory` model** has an `adjustQuantity(delta)` instance method; a shared `InventoryService.updateInventory(storeId, productId, quantity, mode)` is the intended entry point for all stock changes
- **Payment info** is embedded in `invoices` (no separate Payment table)
- **`loyalty_points`** is a one-to-one extension of `customers`

14 tables: `users`, `stores`, `categories`, `products`, `inventory`, `suppliers`, `purchase_orders`, `purchase_order_details`, `stock_transfers`, `customers`, `loyalty_points`, `promotions`, `invoices`, `invoice_details`

## What Needs to Be Built

The backend is a skeleton. To complete it:
1. Add Sequelize models for all 13 remaining tables and define associations
2. Implement `services/` (business logic: InventoryService, OrderService, etc.)
3. Implement `controllers/` and `routes/` for each feature domain
4. Implement JWT auth middleware and role-based access control middleware
5. Uncomment and register routes in `server.ts`
6. Replace frontend mock data in `data.ts` with real API calls
