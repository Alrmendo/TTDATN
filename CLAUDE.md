# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTDATN is a retail chain management system (Vietnamese: Tổ chức Bán lẻ Chuỗi) with a Node.js/Express/TypeScript backend and a React/Vite/TypeScript frontend. **Tuần 5 (22/7/2026) — chuẩn bị deploy (Render + Vercel) + thêm trợ lý AI (Gemini).** Tất cả frontend components đã được wire vào real API: Auth, Account management, Inventory, Customer management, Sales/POS flow, Product/Category/Promotion management, Stock Transfer, Store management, Revenue/Inventory reports (RevenueReport.tsx), Warehouse management (Tồn kho + Đơn nhập hàng), và DashboardOverview (storesCount, bảng "Đơn hàng gần đây", revenue chart today/yesterday/week/month — tất cả đã wire API thật). EmployeeManagement and ReportView have been removed from the codebase.

**Deploy readiness:** toàn bộ URL API phía frontend đã centralize qua `frontend/src/config/api.ts` (đọc `VITE_API_URL`, fallback `http://localhost:5000/api`) — không còn hardcode `http://localhost:5000/api` rải rác, chuẩn bị deploy backend lên Render + frontend lên Vercel. `backend/src/config/database.ts` bật SSL có điều kiện (`dialectOptions.ssl` chỉ thêm khi `DATABASE_URL` chứa `render.com`) để không phá kết nối Postgres local không-SSL. Xem chi tiết ở mục "Frontend API service layer" và "Database Schema" bên dưới.

**Role thứ 4 — BranchManager (Quản lý chi nhánh):** đã có schema/JWT/middleware/seed đầy đủ, nhưng UI hiện chỉ là **placeholder** (chỉ có tab "Tổng quan" hiện thông báo "đang được phát triển" — xem `App.tsx`), chưa có nghiệp vụ thật riêng cho role này. Không tạo được qua `AccountManagement.tsx` (dropdown role ở đó chỉ có Staff/WarehouseStaff/Manager) — hiện chỉ tạo được qua `npm run seed`.

**Trợ lý AI (Gemini function-calling):** khung chat nổi (`AiAssistantWidget.tsx`), chỉ hiện cho Manager + BranchManager, trả lời số liệu kinh doanh thật (qua tool-calling gọi lại `ReportService`/`InventoryService`, không tự viết SQL) và hướng dẫn dùng hệ thống (dựa system prompt mô tả tab thật). Xem mục "AI Assistant" trong Backend bên dưới.

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
- `backend/.env` cần thêm `GEMINI_API_KEY` (Gemini API key thật) nếu muốn dùng tính năng Trợ lý AI (`POST /api/ai/chat`) — không có key thì phần còn lại của backend vẫn chạy bình thường, chỉ endpoint này trả lỗi 500 khi gọi

## Architecture

### Backend (`backend/src/`)
Layered architecture:

- `server.ts` — Express entry point; mounts `/api/auth`, `/api/accounts`, `/api/stores`, `/api/reports`, `/api/inventory`, `/api/invoices`, `/api/customers`, `/api/loyalty-points`, `/api/products`, `/api/categories`, `/api/promotions`, `/api/purchase-orders`, `/api/suppliers`, `/api/stock-transfers`, `/api/ai`. **Lưu ý lịch sử:** mount `/api/loyalty-points` đã từng bị rớt khi merge PR Bán-hàng + main do conflict trên `server.ts` (controller/routes file vẫn tồn tại nhưng không reachable) — đã fix lại; khi resolve conflict trên file này trong tương lai, kiểm tra kỹ không làm rớt mount nào.
- `config/database.ts` — Sequelize + PostgreSQL connection (syncs with `alter: true`); SSL bật có điều kiện dựa vào `DATABASE_URL` chứa `render.com` hay không — xem chi tiết ở mục "Database Schema"
- `types/express.d.ts` — Declaration merging for `req.user` on Express Request; `ts-node` requires `"files": true` in `tsconfig.json` to pick this up

**Models implemented (`models/`):**
| Model file | Table | Notes |
|---|---|---|
| `user.model.ts` | `users` | role ENUM (`Manager`\|`Staff`\|`WarehouseStaff`\|`BranchManager`), bcrypt passwordHash, isActive |
| `store.model.ts` | `stores` | isActive for soft delete |
| `category.model.ts` | `categories` | FK target for products |
| `product.model.ts` | `products` | sku UNIQUE, no quantity column — stock in inventory |
| `inventory.model.ts` | `inventory` | UNIQUE(storeId,productId); `adjustQuantity(delta)` instance method throws if stock goes negative; FK `references` on storeId/productId |
| `customer.model.ts` | `customers` | phone UNIQUE; no updatedAt |
| `invoice.model.ts` | `invoices` | `promotionId` is a nullable FK → `promotions.id` |
| `invoice-detail.model.ts` | `invoice_details` | no timestamps; one row per product per invoice — `OrderService.addItem` upserts by `(invoiceId, productId)`, never inserts a duplicate line for the same product |
| `promotion.model.ts` | `promotions` | `type` ENUM('percentage','fixed'); nullable `productId` FK (NULL = whole-order promo); `isValid(orderValue)` and `calculateDiscount(amount)` instance methods |
| `loyalty-point.model.ts` | `loyalty_points` | `customerId` NOT NULL + UNIQUE FK → `customers.id` (1:1); no `createdAt` |
| `supplier.model.ts` | `suppliers` | actor ngoài hệ thống, chỉ lưu thông tin liên hệ, không có tài khoản đăng nhập |
| `purchase-order.model.ts` | `purchase_orders` | `status` ENUM('pending','completed','cancelled'); `confirmedBy`/`confirmedAt` nullable cho tới khi `confirmReceipt()`; `totalCost` tính trong `PurchaseOrderService.createPurchaseOrder` (không phải instance method `calculateTotalCost()` như Schema.md mục 7 mô tả — lệch vị trí đặt logic, không lệch kết quả) |
| `purchase-order-detail.model.ts` | `purchase_order_details` | `receivedQuantity` nullable, NULL cho tới khi `confirmReceipt()` set — đúng Schema.md mục 8; có `getSubtotal()` instance method |
| `stock-transfer.model.ts` | `stock_transfers` | `status` ENUM('pending','completed'); `confirmedBy`/`confirmedAt` nullable cho tới khi `confirmTransfer()`; không có `updatedAt` |

**Missing models:** không còn — tất cả 14 bảng trong Schema.md đã có model.

**Associations (`models/index.ts`)** — note the explicit `as` aliases; controllers must use these exact aliases in `include:` or the JSON response keys won't match what the frontend types expect:
- `User` ↔ `Store` (N:1)
- `Product` ↔ `Category` (N:1, as `category`)
- `Inventory` ↔ `Store`, `Inventory` ↔ `Product` (N:1 each)
- `Invoice` ↔ `Store`, `Invoice` ↔ `User` (as `staff`), `Invoice` ↔ `Customer` (as `customer`, nullable), `Invoice` ↔ `Promotion` (as `promotion`, nullable)
- `Invoice` ↔ `InvoiceDetail` (1:N, as `invoiceDetails`), `InvoiceDetail` ↔ `Product` (N:1, as `product`)
- `Promotion` ↔ `Product` (N:1, nullable)
- `LoyaltyPoint` ↔ `Customer` (1:1, via `Customer.hasOne`)
- `Supplier` ↔ `PurchaseOrder` (1:N)
- `Store` ↔ `PurchaseOrder` (1:N)
- `PurchaseOrder` ↔ `User` (N:1, as `creator` cho `createdBy`, as `confirmer` cho `confirmedBy`)
- `PurchaseOrder` ↔ `PurchaseOrderDetail` (1:N, as `details`, `onDelete: CASCADE`)
- `PurchaseOrderDetail` ↔ `Product` (N:1, as `product`) — alias `product` trùng tên với alias của `InvoiceDetail↔Product` nhưng model nguồn khác nhau, không phải lỗi (Sequelize cho phép alias trùng tên giữa các association khác source model)
- `StockTransfer` ↔ `Store` (N:1, as `fromStore` cho `fromStoreId`, as `toStore` cho `toStoreId`), `StockTransfer` ↔ `Product` (N:1, as `product`), `StockTransfer` ↔ `User` (N:1, as `creator` cho `createdBy`, as `confirmer` cho `confirmedBy`)

**Controllers implemented (`controllers/`):**
- `auth.controller.ts` — login (bcrypt verify → JWT sign)
- `account.controller.ts` — list, create, update accounts (Manager only)
- `store.controller.ts` — `getStores` (list active stores), `createStore`, `updateStore`, `deactivateStore` (soft delete via `isActive=false`); Manager-only on create/update/deactivate via `roleMiddleware`
- `inventoryController.ts` — get by store, low-stock list, update (increase/decrease)
- `product.controller.ts` — `searchProducts` (active products only, ILIKE on name/sku, includes `category`), `getProducts` (all products incl. inactive, for management UI), `createProduct`, `updateProduct`, `deleteProduct` (soft delete via `isActive=false`, **not** a hard delete despite the name) — full CRUD now implemented; Manager-only on create/update/delete via `roleMiddleware`
- `category.controller.ts` — `getCategories`, `createCategory`, `updateCategory`, `deleteCategory` (hard delete via `destroy()`, **not** soft delete — categories have no `isActive` column); Manager-only on create/update/delete via `roleMiddleware`
- `promotion.controller.ts` — `getPromotions`, `createPromotion`, `updatePromotion` (edit name/value/dates of existing promotion), `deactivatePromotion` (soft-disable via `isActive=false`, matches Schema.md "không cho xóa cứng"); Manager-only on create/update/deactivate via `roleMiddleware`
- `customer.controller.ts` — `searchCustomers` (ILIKE on fullName/phone via `unaccent()`, includes `loyaltyPoints`), `createCustomer` (accepts `fullName`, `phone`, `email`, `address`; 409 on duplicate phone, also creates a `loyalty_points` row), `updateCustomer` (accepts same 4 fields; 404 nếu không tìm thấy, 409 nếu phone mới trùng customer khác qua pre-check `Op.ne`) — **note:** `address` được backend nhận nhưng UI chưa expose (form chỉ có fullName/phone/email)
- `loyaltyPoint.controller.ts` — `getBalance` (đọc `customerId` từ query, 400 nếu thiếu), `redeemPoints` (đọc `customerId`/`amount` từ body, 400 nếu thiếu/invalid, **422** nếu `LoyaltyPointService.redeemPoints` trả `false` do không đủ điểm); chỉ `authMiddleware`, không `roleMiddleware` — Staff dùng trực tiếp khi bán hàng
- `order.controller.ts` — `createOrder`, `addItem` (422 on `'Tồn kho không đủ'`), `removeItem`, `applyPromotion`, `confirmPayment` (422 on `'Số tiền không đủ'`), `getInvoices` (role-scoped: Staff forced to own store, Manager optional `storeId`; supports `startDate`/`endDate`/`search`; includes `invoiceDetails`/`customer`/`staff`/`promotion`/`store` — `store` được thêm tuần 3 để trả `storeName` cho DashboardOverview)
- `purchase-order.controller.ts` — `createPurchaseOrder` (Manager), `getPurchaseOrders` (Manager + WarehouseStaff, store-scoped cho WarehouseStaff), `getPurchaseOrderById`, `confirmReceipt` (WarehouseStaff, gọi `InventoryService.updateInventory(storeId, productId, receivedQuantity, 'increase')` — đã verify đúng signature, đúng dùng `receivedQuantity` thực nhận không phải `quantity` đặt ban đầu), `cancelPurchaseOrder` (Manager, chỉ huỷ được khi `status='pending'`)
- `supplier.controller.ts` — `getSuppliers` (mọi role đã login), `createSupplier` (Manager); **không theo convention chuẩn** — thiếu `return;` sau mỗi `res.json()`/`res.status()`, dùng `catch (error) { console.error(...) }` thay vì `catch {}` không bind (xem Known issues #10)
- `stock-transfer.controller.ts` — `getTransfers` (mọi role đã login, filter tùy chọn `status`/`storeId` khớp `fromStoreId` HOẶC `toStoreId`), `createTransfer` (Manager), `confirmTransfer` (WarehouseStaff) — dùng `catch (err) { if (err instanceof StockTransferServiceError) {...} }`, theo đúng pattern custom-error-class đã ghi nhận tốt ở `purchase-order.controller.ts`
- `report.controller.ts` — `getRevenueReport` (`GET /api/reports/revenue`; hỗ trợ `mode=month|quarter|year` (kèm `month`/`quarter`+`year`) hoặc mặc định `startDate`/`endDate`; validate `startDate <= endDate`), `getInventoryReport` (`GET /api/reports/inventory?storeId=`, `storeId` optional = toàn hệ thống); cả 2 chỉ gọi `ReportService` (`services/report.service.ts`), không viết query riêng; Manager-only qua `roleMiddleware(['Manager'])`
- `ai.controller.ts` — `chat` (`POST /api/ai/chat`, Manager + BranchManager): nhận `{ message: string }`, chạy vòng lặp Gemini function-calling (tối đa 5 round) qua SDK `@google/genai`; tool declarations + executor nằm ở `services/ai-tools.service.ts`; tự fallback sang model `gemini-flash-lite-latest` (đúng 1 lần/request, không lặp) nếu model chính `gemini-flash-latest` ném `ApiError` với `status === 429` (quota/rate-limit thật của Gemini API — xem type `ApiError` trong `@google/genai`); system prompt tự chèn ngày hiện tại (để tính đúng "tháng này"/"quý này"/"năm nay") + đoạn ép buộc riêng cho BranchManager: phải mô tả số liệu đúng là của riêng chi nhánh họ (không nói "toàn hệ thống") dù bị yêu cầu "bỏ qua giới hạn"; trả `{ reply: string }`

> **Note:** unlike `OrderService`/`InventoryService`, there is no separate `ProductService`/`CategoryService`/`PromotionService` on the backend — `product.controller.ts`/`category.controller.ts`/`promotion.controller.ts` call the Sequelize models directly. This is inconsistent with the layered-service pattern documented above; flagged for future cleanup, not blocking.

> **Ghi nhận cách làm tốt:** `purchase-order.controller.ts` dùng `catch (err) { if (err instanceof PurchaseOrderServiceError) {...} }` — custom error class mang `statusCode` riêng, cho phép trả đúng status code (400/404/409) thay vì luôn 500 chung. Khác với pattern `catch {}` không bind đã ghi ở mục "TypeScript notes", nhưng đây là **cải tiến có chủ đích**, không phải lệch convention cần sửa. Nên cân nhắc áp dụng lại cho `customer.controller.ts`/`order.controller.ts` sau này.

**Middleware implemented (`middleware/`):**
- `auth.middleware.ts` — verifies Bearer JWT, attaches `req.user`
- `role.middleware.ts` — `roleMiddleware(allowedRoles[])` factory

**Routes implemented (`routes/`):**
- `auth.routes.ts` → `POST /api/auth/login`
- `account.routes.ts` → `GET /api/accounts`, `POST /api/accounts`, `PUT /api/accounts/:id`
- `store.routes.ts` → `GET /api/stores` (auth only), `POST /api/stores`, `PUT /api/stores/:id`, `PATCH /api/stores/:id/deactivate` (last 3 are Manager-only)
- `inventory.routes.ts` → `GET /api/inventory`, `GET /api/inventory/low-stock`, `PATCH /api/inventory` (WarehouseStaff only)
- `product.routes.ts` → `GET /api/products/search`, `GET /api/products` (auth only), `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` (last 3 are Manager-only)
- `category.routes.ts` → `GET /api/categories` (auth only), `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id` (last 3 are Manager-only)
- `promotion.routes.ts` → `GET /api/promotions` (auth only), `POST /api/promotions`, `PUT /api/promotions/:id` (= general update — name/value/dates), `PATCH /api/promotions/:id/deactivate` (= soft-disable, Manager-only on last 3)
- `customer.routes.ts` → `GET /api/customers`, `POST /api/customers`, `PUT /api/customers/:id` (Staff, Manager)
- `loyaltyPointRoutes.ts` → `GET /api/loyalty-points/balance`, `POST /api/loyalty-points/redeem` (auth only, mọi role — không giới hạn theo `roleMiddleware`)
- `order.routes.ts` → `POST /api/invoices`, `POST /api/invoices/:id/items`, `DELETE /api/invoices/:id/items/:productId`, `POST /api/invoices/:id/promotion`, `POST /api/invoices/:id/confirm-payment` (all Staff only), `GET /api/invoices` (Staff, Manager)
- `purchase-order.routes.ts` → `GET /api/purchase-orders` (Manager + WarehouseStaff), `GET /api/purchase-orders/:id` (Manager + WarehouseStaff), `POST /api/purchase-orders` (**Manager only**), `PUT /api/purchase-orders/:id/confirm` (**WarehouseStaff only**), `PUT /api/purchase-orders/:id/cancel` (**Manager only**) — phân quyền tách theo từng hành động, đã verify đúng Schema.md mục 7 (khác SP-KM toàn bộ Manager-only)
- `supplier.routes.ts` → `GET /api/suppliers` (auth only), `POST /api/suppliers` (Manager)
- `stock-transfer.routes.ts` → `GET /api/stock-transfers` (auth only, mọi role), `POST /api/stock-transfers` (**Manager only** — khởi tạo phiếu), `PUT /api/stock-transfers/:id/confirm` (**WarehouseStaff only** — xác nhận nhận hàng tại `toStoreId`)
- `report.routes.ts` → `GET /api/reports/revenue`, `GET /api/reports/inventory` (cả 2 Manager-only)
- `ai.routes.ts` → `POST /api/ai/chat` (auth + `roleMiddleware(['Manager','BranchManager'])`)

**Services implemented (`services/`):**
- `InventoryService.ts` — `updateInventory(storeId, productId, quantity, mode)`, `checkLowStock(storeId?)`, `getStockByStore(storeId)`, `checkStock(...)`
- `OrderService.ts` — `createOrder`, `addItem` (upserts by productId, throws `'Tồn kho không đủ'` via `InventoryService.checkStock`), `removeItem`, `applyPromotion` (no-op discount=0 + 200 response if `Promotion.isValid()` fails — **not** an HTTP error), `confirmPayment` (throws `'Số tiền không đủ'` if `amount < totalAmount`, decrements inventory per line, awards `floor(totalAmount / 10000)` loyalty points if `customerId` is set); `recalculateSubtotal` (private, gọi lại sau mỗi `addItem`/`removeItem`) giờ có **guard discount**: nếu `invoice.promotionId !== null` hoặc `discountAmount > 0`, tự reset `promotionId=null`/`discountAmount=0`/`totalAmount=subtotal` — xem "Known gap" cũ đã được fix bên dưới
- `LoyaltyPointService.ts` — `addPoints`, `redeemPoints` (returns `false` without mutating if balance insufficient), `getBalance` — đã có HTTP surface qua `loyaltyPointRoutes.ts`/`loyaltyPoint.controller.ts`
- `PurchaseOrderService.ts` — `createPurchaseOrder` (transaction: tạo order + bulk-create details, `totalCost` tính từ `items`), `getPurchaseOrders` (filter `storeId`/`status`/`startDate`/`endDate`; **tham số `search` được nhận nhưng không dùng để filter gì cả** — xem Known issues #8), `getPurchaseOrderById`, `confirmReceipt` (transaction: update từng `receivedQuantity` + gọi `InventoryService.updateInventory(..., 'increase')` dùng chung, không viết riêng), `cancelOrder` (chỉ huỷ khi `status='pending'`)
- `StockTransferService.ts` — `createTransfer` (validate `fromStoreId !== toStoreId` và `quantity > 0`, ném `StockTransferServiceError`), `confirmTransfer` (atomic qua 1 `sequelize.transaction`: `InventoryService.updateInventory(fromStoreId, productId, quantity, 'decrease', t)` rồi `(toStoreId, ..., 'increase', t)` rồi update `status='completed'` — nếu bước nào fail thì cả transaction rollback, không cần rollback tay)
- `report.service.ts` (default export `ReportService`) — `getRevenueReport(startDate, endDate, storeId?)` (trả `totalRevenue`/`totalOrders`/`dailyRevenue`/`topProducts` top-5), `getMonthlyBreakdown(year, startMonth, endMonth, storeId?)` (private, dùng chung cho 3 hàm dưới), `getMonthRevenue`/`getQuarterRevenue`/`getYearRevenue(..., storeId?)`, `getInventoryReport(storeId?)` (join Product+Store, tính `totalStockValue`/`lowStockCount`); đây là service duy nhất `ai-tools.service.ts` tái sử dụng cho tool `get_revenue_report`/`get_inventory_by_store` — không viết query mới cho AI
- `ai-tools.service.ts` — không phải service nghiệp vụ mới; chỉ khai báo 3 `FunctionDeclaration` cho Gemini (`get_revenue_report`, `get_low_stock_products`, `get_inventory_by_store`) và `executeTool(name, args, caller)` gọi lại đúng `ReportService`/`InventoryService` (`Inventory.service.ts`, không phải `InventoryService.ts` — 2 file khác nhau, xem bảng Services) đã có sẵn; `resolveStoreId(caller, requested)` LUÔN ép `storeId = caller.storeId` khi `caller.role === 'BranchManager'` (bỏ qua `requested` dù AI truyền gì), cho Manager dùng `requested` hoặc để trống = toàn hệ thống

**Fixed (trước đây là "Known gap"):** `OrderService.applyPromotion`/`addItem`/`removeItem` — guard discount đã được thêm vào `recalculateSubtotal` (xem trên). Frontend (`SalesManagement.tsx`) vẫn giữ client-side mitigation riêng (clear local discount khi sửa cart) — không còn bắt buộc về mặt đúng-sai dữ liệu vì backend đã tự bảo vệ, nhưng giữ lại để UX phản hồi tức thì không cần round-trip.

**Known issues — tuần 2:**
1. ~~**`PromotionService.updatePromotion` + `PUT` endpoint thật**~~ — **đã xong tuần 3**: `updatePromotion` controller + `PUT /api/promotions/:id` đã có, nút "Sửa" trên `PromotionManagement.tsx` đã được kích hoạt.
2. **`createProduct` trả lỗi 500 chung khi trùng `sku`** (`product.controller.ts`) — không bắt riêng lỗi UNIQUE constraint để trả `409` như pattern đã có ở `customer.controller.ts` (createCustomer trả 409 khi trùng phone).
3. **SKU sinh phía client dễ trùng** (`ProductManagement.tsx handleCreate`: `SP0${products.length+1}`) — dựa vào số lượng sản phẩm đang hiển thị (có thể đã filter/search), nên dễ va với SKU đã tồn tại → rơi vào bug #2 trên, lỗi 500 không rõ nguyên nhân cho người dùng. Nên đổi sang để backend tự sinh SKU hoặc validate trước khi submit.
4. **`category.controller.ts` dùng `catch (error) { console.error(error); ... }`** thay vì pattern `catch { }` không bind error đã thống nhất ở mục "TypeScript notes" (`product.controller.ts`/`promotion.controller.ts` đều tuân thủ đúng).
5. **Dead prop `onAddPromotion`** trong `PromotionManagementProps` (`PromotionManagement.tsx`) — còn khai báo + destructure nhưng không gọi ở đâu (logic mới gọi `createPromotion` service trực tiếp). Nên dọn khi làm gap #1.
6. ~~**Không có `roleMiddleware` trên `category.routes.ts`**~~ — **đã xử lý tuần 3**: category.routes.ts nay có đầy đủ `POST`/`PUT`/`DELETE` với `roleMiddleware(['Manager'])` theo đúng pattern.
7. **Thiếu try/catch quanh các lời gọi service ở `App.tsx`** — `handleAddProduct`/`handleUpdateProduct`/`handleDeleteProduct` gọi `createProduct`/`updateProduct`/`deleteProduct` (từ `services/product.service.ts`) không có try/catch. Nếu backend trả lỗi (404, 409, 500...), promise reject không được bắt → unhandled rejection, không có thông báo nào cho người dùng. Khác với `PromotionManagement.tsx` đã có try/catch + `alert(...)` quanh `createPromotion`/`deactivatePromotion`. Cần chuẩn hóa xử lý lỗi khi đụng tới các hàm này lần sau.
8. **`PurchaseOrderService.getPurchaseOrders` nhận `search` param nhưng không filter gì** — controller destructure và truyền `search` xuống service, nhưng trong `where` clause của service không có dòng nào dùng `params.search`. Không gây lỗi runtime (không phải bug), chỉ là tham số chết — nếu sau này có frontend gửi `?search=...` sẽ không có tác dụng gì mà cũng không báo lỗi. Cần bổ sung logic search (ví dụ ILIKE trên tên supplier) khi làm frontend cho module này.
9. ~~`stock_transfers` vẫn chưa được phân công~~ — **đã xong**: model/service/controller/route/frontend đầy đủ (xem các mục tương ứng ở trên). `StockTransferManagement.tsx` đã wire vào `App.tsx` cho Manager + WarehouseStaff.
10. **`supplier.controller.ts` không theo convention chuẩn** — thiếu `return;` sau mỗi `res.json()`/`res.status()` (có thể response tiếp tục chạy xuống code dưới dù controller hiện tại không có gì sau đó nên chưa gây lỗi thật, nhưng dễ thành bug nếu thêm logic), và dùng `catch (error) { console.error(error); ... }` thay vì `catch {}` không bind — cùng vấn đề đã ghi ở #4 cho `category.controller.ts`. Nên chuẩn hóa khi sửa `supplier.controller.ts` lần sau.
11. **`/api/loyalty-points` từng bị rớt mount khi merge** — conflict trên `backend/src/server.ts` giữa branch `Bán-hàng` (thêm mount loyalty-points) và `main` (đã có category/promotion/purchase-order/supplier/stock-transfer) khiến dòng mount loyalty-points bị mất trong merge commit, dù file `loyaltyPoint.controller.ts`/`loyaltyPointRoutes.ts` vẫn tồn tại. Đã phát hiện và fix lại. **Bài học:** khi resolve conflict trên `server.ts`, phải so cả 2 phía đầy đủ — không chỉ lấy 1 bên — vì mỗi nhánh thường chỉ thêm 1-2 dòng mount riêng.

**Known issues — tuần 3:**
1. ~~**`DashboardOverview` gọi sai path**~~ — **đã xong (SP-KM)**: `reportApi.ts` đã dùng `/api/reports/revenue` (có chữ **s**); `DashboardOverview` đã gọi `fetchRevenueReport` cho today/yesterday/week/month, chart SVG hoạt động bình thường.
2. ~~**`DashboardOverview.storesCount` vẫn là mock**~~ — **đã xong**: wire qua `getStores()` trong `services/store.service.ts`, gộp vào `Promise.all` hiện có trong `loadDashboardData`.
3. ~~**`DashboardOverview` bảng "Đơn hàng gần đây" vẫn là mock**~~ — **đã xong**: wire qua `fetch('/api/invoices')` gộp vào cùng `Promise.all` (backend không có `limit`/`status` query param nên lọc `status === 'completed'` + `.slice(0, 5)` phía client); `getInvoices` trong `order.controller.ts` đã bổ sung `include Store` (as `'store'`, attributes `['storeName']`) để trả `storeName` cho Dashboard — trước đó chỉ include `invoiceDetails`/`customer`/`staff`/`promotion`.
4. ~~**`PUT /api/customers/:id` chưa có**~~ — **đã xong**: thêm `updateCustomer` controller (404 nếu không tìm thấy, 409 nếu phone mới trùng customer khác qua pre-check `Op.ne`) + route `PUT /api/customers/:id` với `roleMiddleware(['Staff','Manager'])` khớp đúng quyền với `GET`/`POST`.

### Frontend (`frontend/src/`)
All application state lives in `App.tsx` via React hooks — no Redux or Context. Feature components are passed state and callbacks as props.
- `App.tsx` — Root component; owns all state, routing logic, login/role gating; session persisted in `localStorage`
- `types.ts` — All shared TypeScript interfaces; includes `ApiAccount`, `ApiStore`, `AuthUser`, `ApiCustomer`, `ApiPromotion`, `ApiInvoice`, `ApiInvoiceDetail`, `ApiProduct` (the original mock-shaped `Product`/`Customer`/`Promotion`/`Invoice` interfaces still exist too — kept only so unmigrated components and unused prop signatures still compile, do not use them for new API-backed work)
- `utils/roleMapping.ts` — `roleLabels` (enum → Vietnamese), `roleLabelToEnum` (Vietnamese → enum), `defaultTabByRole`
- `data.ts` — Mock data; `initialProducts` đã đổi thành `[]` sau khi audit (commit 2612017, SP-KM). `initialInvoices`/`initialStores` còn mock data nhưng không còn component active nào đọc.
- `components/` — One file per business domain

**`frontend/src/config/api.ts`** — export `API_BASE`, đọc `import.meta.env.VITE_API_URL`, fallback `'http://localhost:5000/api'` nếu chưa set (không set thì `npm run dev` local chạy y hệt trước đây, không bị ảnh hưởng). **Chuẩn deploy chính thức** kể từ khi chuẩn bị Render+Vercel: 15 file trước đây hardcode literal `'http://localhost:5000/api'` (`App.tsx`, `AccountManagement.tsx`, `DashboardOverview.tsx`, `OrderHistory.tsx`, `RevenueReport.tsx`, `SalesManagement.tsx`, `StockTransferManagement.tsx`, và 8 file `services/category|customer|product|promotion|store|stock-transfer.service.ts` + `inventoryApi.ts` + `reportApi.ts`) đã đổi sang import `API_BASE` từ file này. Deploy production: set biến môi trường `VITE_API_URL` trên Vercel **trước khi build** (Vite inline biến env lúc build, không đọc runtime). Riêng `WarehouseManagement.tsx` tự đọc `VITE_API_URL` theo cách khác từ trước (`const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'` — fallback KHÔNG có `/api`, tự thêm `/api/...` ở từng call site) — chưa đồng bộ về dùng chung `API_BASE`, không phải lỗi nhưng khác convention nên cần biết khi sửa file này.

**Frontend API service layer (`services/`)** — convention mới, áp dụng cho code Sản phẩm/Danh mục/Khuyến mãi trở đi:
- `product.service.ts`, `category.service.ts`, `promotion.service.ts`, `customer.service.ts`, `stock-transfer.service.ts`, `store.service.ts` — dùng `axios` (không phải `fetch()` thô như `AccountManagement.tsx`/`SalesManagement.tsx`), mỗi service file export các hàm gọi API tương ứng 1 resource, tự đính `Authorization` header từ `localStorage.getItem('token')`.
- `inventoryApi.ts`, `reportApi.ts` — dùng `fetch()` thô (không phải axios); được dùng bởi `WarehouseManagement.tsx` và `DashboardOverview.tsx`/`RevenueReport.tsx` tương ứng.
- **Đây là pattern chính thức cho module mới** kể từ branch SP-KM — không bắt buộc đồng bộ lại `AccountManagement.tsx`/`SalesManagement.tsx` sang pattern này ngay, nhưng module mới nên theo `services/*.service.ts` thay vì `fetch()` trực tiếp trong component.
- `axios` đã được khai báo trong `frontend/package.json` (`^1.18.0`) — bắt buộc `npm install` lại sau khi pull nếu chưa có trong `node_modules`.
- **Lưu ý xử lý lỗi chưa nhất quán:** một số call site có try/catch quanh các hàm service (vd. `PromotionManagement.tsx`), một số không (vd. `App.tsx handleAddProduct/handleUpdateProduct/handleDeleteProduct` — xem "Known issues — tuần 2" #7) — lỗi HTTP sẽ là unhandled rejection, không có thông báo cho người dùng. Cần chuẩn hóa khi viết thêm service mới.

**Components connected to real API:**
- `AccountManagement.tsx` — fetches `GET /api/accounts` + `GET /api/stores`; POST create, PUT edit/toggle
- `SalesManagement.tsx` — full POS flow against `/api/invoices`, `/api/products/search`, `/api/customers`. Receives the old mock props (`products`, `customers`, `promotions`, `onAddInvoice`, etc.) to keep `App.tsx` unchanged, but destructures them with `_` prefixes and never reads them — everything is fetched fresh. Starts a new draft invoice on mount (`POST /api/invoices`); add/quantity-change both funnel through one `submitItem` helper that calls `POST /api/invoices/:id/items` (upsert); editing the cart after a promotion was applied clears the local discount and requires manual re-apply.
- `OrderHistory.tsx` — Staff "Lịch sử đơn hàng" tab; `GET /api/invoices` with `startDate`/`endDate`/`search`; today's order count/revenue computed client-side from the fetched list (no extra request); detail modal + `window.print()`-based invoice printing. Replaced `ReportView` for this tab.
- `ProductManagement.tsx` — full CRUD qua `services/product.service.ts` + `services/category.service.ts`; search server-side qua `GET /api/products/search`; form tạo/sửa map `categoryId` ↔ `categoryName` qua danh sách `categories` (props từ `App.tsx`); xóa = soft delete (`isActive=false`), label nút vẫn ghi "Xóa" trên UI dù backend chỉ vô hiệu hóa.
- `PromotionManagement.tsx` — list + create + update qua `services/promotion.service.ts`; nút "Sửa" đã được kích hoạt và wire vào `updatePromotion`; không có UI chọn sản phẩm cụ thể theo `productId` — mọi khuyến mãi tạo từ UI này đều là loại "toàn đơn hàng".
- `CustomerManagement.tsx` — list + create + update qua `services/customer.service.ts` (`searchCustomers`/`createCustomer`/`updateCustomer`); map `ApiCustomer → Customer` cục bộ trong component (`fullName→name`, `loyaltyPoints.points`, `memberLevel→tier` qua `mapTier()` fallback `'Đồng'` nếu null, `createdAt→joinDate`); filter theo tier/search vẫn chạy client-side trên data đã fetch (không gọi API lại mỗi lần đổi filter). Nút **"Sửa" đã được kích hoạt** — gọi `updateCustomer` qua `services/customer.service.ts`, reload list bằng `loadCustomers()` sau khi sửa thành công, lỗi (409 trùng phone, 404) hiển thị qua `alert`. Modal "Sửa" đã bỏ 2 input "Phân bậc xếp hạng"/"Điểm số tích lũy" vì backend không nhận field này (tier/loyaltyPoints nằm ở bảng `loyalty_points` riêng). Modal "Thêm khách hàng" đã bỏ 2 input Hạng/Điểm khởi tạo vì backend không nhận field này (luôn tạo `loyalty_points` với `points=0`). Props `customers`/`onAddCustomer` từ `App.tsx` vẫn giữ trong interface nhưng là dead prop (không gọi).
- `StockTransferManagement.tsx` — qua `services/stock-transfer.service.ts`; wired vào `App.tsx` cho cả Manager (tạo phiếu) và WarehouseStaff (xác nhận nhận hàng).
- `WarehouseManagement.tsx` — tab **Tồn kho** dùng `inventoryApi.fetchStockByStore` → `GET /api/inventory`; tab **Đơn nhập hàng** dùng `GET /api/purchase-orders`, `POST /api/purchase-orders`, `PUT /api/purchase-orders/:id/confirm`, `PUT /api/purchase-orders/:id/cancel` — tất cả qua real API. Tab "Điều chuyển hàng" (mock cũ ~400 dòng) đã bị xóa khỏi component này sau khi `StockTransferManagement.tsx` ra đời.
- `StoreManagement.tsx` — full CRUD qua `services/store.service.ts` → `GET/POST/PUT /api/stores`, `PATCH /api/stores/:id/deactivate`.
- `RevenueReport.tsx` — dùng hai hooks `useRevenueReport`/`useInventoryReport` gọi `reportApi.fetchRevenueReport`/`fetchInventoryReport`; props mock cũ đã bỏ.
- `DashboardOverview.tsx` — đã wire API thật hoàn toàn: `fetchLowStock()` → low-stock list; `getStores()` → storesCount; `fetchRevenueReport()` (gọi 4 lần: today/yesterday/week/month) → revenue cards + SVG line chart; `fetch(\`${API_BASE}/invoices\`)` → bảng "Đơn hàng gần đây" (filter `status==='completed'` + `.slice(0,5)` client-side). **Đã fix (chuẩn bị deploy):** trước đây dùng hardcoded `http://localhost:5000/api/invoices`, giờ dùng `API_BASE` từ `config/api.ts` — không còn inconsistency với `reportApi.ts`.
- `AiAssistantWidget.tsx` — khung chat AI nổi góc phải dưới màn hình; chỉ render khi `userRole` (prop, chuỗi tiếng Việt từ `App.tsx`) là `'Quản lý'` hoặc `'Quản lý chi nhánh'` — so khớp đúng cách `App.tsx` đang phân role, không dùng `AuthUser.role` enum tiếng Anh; gọi `POST ${API_BASE}/ai/chat` với `{ message }`, hiển thị `data.reply`; gắn vào `App.tsx` ngay trước thẻ `</div>` gốc (ngoài mọi khối điều kiện login/tab) nên hiện được ở mọi tab sau khi đăng nhập, không phụ thuộc `activeTab`.

**Components still using mock data (not yet migrated):**
- (Không còn — tất cả component đã wire API thật.)

### Login credentials
Real (seeded in DB via `npm run seed` — mật khẩu mặc định tất cả tài khoản: `password123`; đã verify thật qua login API trong phiên test AI assistant):
- Manager: `manager@test.com`
- Staff (1/chi nhánh): `staff.q1@test.com`, `staff.q7@test.com`, `staff.bt@test.com`
- WarehouseStaff (1/chi nhánh): `warehouse.q1@test.com`, `warehouse.q7@test.com`, `warehouse.bt@test.com`
- BranchManager (1/chi nhánh, xem mục BranchManager ở trên): `branchmanager.q1@test.com`, `branchmanager.q7@test.com`, `branchmanager.bt@test.com`

Form đăng nhập (`App.tsx`) chỉ có nút quick-fill demo cho Manager (`manager@test.com`) trong panel "Cổng thử nghiệm vai trò" — các role khác phải gõ tay email/password ở trên.

### Seeded data (after `npm run seed`)
Seed đã được mở rộng nhiều so với version đầu — số liệu dưới đây verify trực tiếp từ output thật của `npm run seed` (không phải suy đoán):
- 10 users: 1 Manager + 3 Staff + 3 WarehouseStaff + 3 BranchManager (1 mỗi chi nhánh cho 3 role sau)
- 3 stores: Chi nhánh Quận 1, Quận 7, Bình Thạnh
- 4 categories: Đồ uống, Bánh kẹo, Đồ ăn vặt, Sữa & Sản phẩm từ sữa
- 15 products: SP0001–SP0015 (Coca Cola, Pepsi, Lavie, trà xanh, cà phê lon, bánh mì, bánh quy, kẹo dẻo, snack, mì tôm, sữa tươi, sữa chua uống, phô mai que, nước tăng lực, bánh gạo lứt)
- Inventory: cả 15 sản phẩm ở cả 3 chi nhánh (số lượng ngẫu nhiên mỗi lần seed)
- 10 customers với loyalty points + hạng (Đồng/Bạc/Vàng/Kim cương)
- 3 suppliers
- 7 purchase orders trải theo status pending/completed/cancelled, từ "day-6" tới "day-0" (tính từ lúc chạy seed)
- 4 stock transfers (status pending/completed)
- 4 promotions (gồm 1 khuyến mãi Tết đã hết hạn, dùng để test `Promotion.isValid()`)
- 325 invoices trải từ day-6 tới day-0, kèm doanh thu mục tiêu/thực tế in ra console — dùng để test báo cáo doanh thu theo ngày/tháng/quý/năm

## Database Schema

Full schema with design rationale is in `Schema.md`. Key decisions:

- **UUID string primary keys** throughout all tables
- **Single `users` table** with `role` enum (`Manager` | `Staff` | `WarehouseStaff` | `BranchManager`) — no inheritance tables
- **`isActive` boolean** for soft deletes on users, products, stores, promotions
- **`Inventory` model** has an `adjustQuantity(delta)` instance method; a shared `InventoryService.updateInventory(storeId, productId, quantity, mode)` is the intended entry point for all stock changes — do NOT create per-module variants
- **Payment info** is embedded in `invoices` (no separate Payment table)
- **`loyalty_points`** is a one-to-one extension of `customers`
- **`backend/src/config/database.ts`** bật SSL có điều kiện: `useSSL = DATABASE_URL?.includes('render.com')`; khi `true` thêm `dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }`, khi `false` giữ nguyên config gốc (không có field `ssl`) — để Postgres local (không SSL) và Postgres trên Render (bắt buộc SSL) cùng chạy được từ cùng 1 codebase, tùy `DATABASE_URL` trong `.env`

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
1. Hardening cho `product.controller.ts createProduct`: trả `409` khi trùng `sku` thay vì `500` chung (Known issues — tuần 2 #2)
2. Bổ sung logic filter `search` cho `PurchaseOrderService.getPurchaseOrders` (Known issues — tuần 2 #8)
3. Chuẩn hóa `supplier.controller.ts` theo convention `return;`/`catch {}` (Known issues tuần 2 #10)

**Backend — đã xong (không còn pending):**
- ~~Category CRUD~~ — đã xong đầy đủ `POST/PUT/DELETE /api/categories`
- ~~`PromotionService.updatePromotion` + `PUT` endpoint~~ — đã xong
- ~~Loyalty Point routes~~ — đã có, đã fix mount
- ~~Server-side guard `discountAmount`~~ — đã thêm vào `OrderService.recalculateSubtotal`
- ~~Missing model `stock_transfers`~~ — đã xong model/service/controller/route/frontend
- ~~`PUT /api/customers/:id`~~ — đã xong: `updateCustomer` controller + route `PUT /api/customers/:id` với `roleMiddleware(['Staff','Manager'])`

**Backend — BranchManager & AI assistant (mới):**
1. Nghiệp vụ thật cho BranchManager (schema/JWT/seed đã có, UI vẫn placeholder) — chưa rõ scope cụ thể sẽ làm gì khác Manager ngoài "xem trong phạm vi chi nhánh mình".
2. `AccountManagement.tsx` chưa cho tạo tài khoản `BranchManager` qua UI (dropdown role chỉ có Staff/WarehouseStaff/Manager) — hiện chỉ tạo được qua `npm run seed`.
3. Model `gemini-flash-latest` dùng cho `ai.controller.ts` có quota free-tier giới hạn (20 request/ngày khi test) — đã có fallback tự động sang `gemini-flash-lite-latest` khi gặp lỗi 429, nhưng nếu dùng nhiều cho demo/bảo vệ đồ án nên cân nhắc nâng cấp key trả phí hoặc đổi hẳn sang model lite.

**Frontend — còn cần làm (minor):**
- `WarehouseManagement.tsx`: đọc `VITE_API_URL` theo cách riêng (fallback không có `/api`, tự thêm `/api/...` mỗi call site) — chưa đồng bộ về dùng chung `API_BASE` từ `config/api.ts` như 15 file khác. Không phải lỗi, chỉ là inconsistency nhỏ.
- `CustomerManagement.tsx`: form tạo/sửa chưa expose field `address` dù backend đã nhận (minor UX gap).

**Frontend — đã xong (không còn pending):**
- ~~`WarehouseManagement`~~ — đã wire tab Tồn kho + Đơn nhập hàng vào real API
- ~~`StoreManagement`~~ — đã wire qua `services/store.service.ts`
- ~~`RevenueReport`~~ — đã wire qua `reportApi.ts` hooks
- ~~`PromotionManagement` nút Sửa~~ — đã kích hoạt sau khi có `updatePromotion`
- ~~`DashboardOverview` storesCount + bảng "Đơn hàng gần đây"~~ — đã wire API thật: `getStores()` + `fetch(\`${API_BASE}/invoices\`)` gộp vào `Promise.all`
- ~~`DashboardOverview` revenue chart + cards~~ — **đã xong (SP-KM)**: `fetchRevenueReport` wire 4 lần (today/yesterday/week/month), path `/api/reports/revenue` đã đúng
- ~~`CustomerManagement.tsx` nút Sửa~~ — đã kích hoạt sau khi có `PUT /api/customers/:id`
- ~~`DashboardOverview` hardcode `http://localhost:5000`~~ — đã đổi sang `API_BASE` từ `config/api.ts`
- ~~Centralize API base URL cho deploy~~ — 15 file đã đổi sang `config/api.ts` (xem mục "Frontend API service layer")
- ~~Trợ lý AI (Gemini)~~ — đã có `AiAssistantWidget.tsx` + `POST /api/ai/chat`, wire vào `App.tsx`, chỉ hiện cho Manager/BranchManager
