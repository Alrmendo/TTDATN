# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTDATN is a retail chain management system (Vietnamese: Tổ chức Bán lẻ Chuỗi) with a Node.js/Express/TypeScript backend and a React/Vite/TypeScript frontend. The frontend components are being migrated from mock data to real API calls one by one. Auth, Account management, Inventory, Customer management, the Sales/POS flow (orders, customers, promotions, loyalty points), Product/Category/Promotion management (CRUD for products, read-only categories, create+deactivate for promotions), and Stock Transfer between branches are implemented end-to-end (backend + frontend). Most other modules (Warehouse purchase-in UI, Stores, Dashboard, Employee, Reports) still use mock data on the frontend and/or have no backend routes yet.

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

- `server.ts` — Express entry point; mounts `/api/auth`, `/api/accounts`, `/api/stores`, `/api/inventory`, `/api/invoices`, `/api/customers`, `/api/loyalty-points`, `/api/products`, `/api/categories`, `/api/promotions`, `/api/purchase-orders`, `/api/suppliers`, `/api/stock-transfers`. **Lưu ý lịch sử:** mount `/api/loyalty-points` đã từng bị rớt khi merge PR Bán-hàng + main do conflict trên `server.ts` (controller/routes file vẫn tồn tại nhưng không reachable) — đã fix lại; khi resolve conflict trên file này trong tương lai, kiểm tra kỹ không làm rớt mount nào.
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
- `store.controller.ts` — list active stores
- `inventoryController.ts` — get by store, low-stock list, update (increase/decrease)
- `product.controller.ts` — `searchProducts` (active products only, ILIKE on name/sku, includes `category`), `getProducts` (all products incl. inactive, for management UI), `createProduct`, `updateProduct`, `deleteProduct` (soft delete via `isActive=false`, **not** a hard delete despite the name) — full CRUD now implemented; Manager-only on create/update/delete via `roleMiddleware`
- `category.controller.ts` — `getCategories` (list only; no create/update/delete endpoint exists yet)
- `promotion.controller.ts` — `getPromotions`, `createPromotion`, `deactivatePromotion` (soft-disable via `isActive=false`, matches Schema.md "không cho xóa cứng"); **no `updatePromotion`** — editing an existing promotion's name/value/dates is not supported by the backend yet (see "Known issues — tuần 2" below); Manager-only on create/deactivate via `roleMiddleware`
- `customer.controller.ts` — `searchCustomers` (ILIKE on fullName/phone, includes `loyaltyPoints`), `createCustomer` (409 on duplicate phone, also creates a `loyalty_points` row)
- `loyaltyPoint.controller.ts` — `getBalance` (đọc `customerId` từ query, 400 nếu thiếu), `redeemPoints` (đọc `customerId`/`amount` từ body, 400 nếu thiếu/invalid, **422** nếu `LoyaltyPointService.redeemPoints` trả `false` do không đủ điểm); chỉ `authMiddleware`, không `roleMiddleware` — Staff dùng trực tiếp khi bán hàng
- `order.controller.ts` — `createOrder`, `addItem` (422 on `'Tồn kho không đủ'`), `removeItem`, `applyPromotion`, `confirmPayment` (422 on `'Số tiền không đủ'`), `getInvoices` (role-scoped: Staff forced to own store, Manager optional `storeId`; supports `startDate`/`endDate`/`search`)
- `purchase-order.controller.ts` — `createPurchaseOrder` (Manager), `getPurchaseOrders` (Manager + WarehouseStaff, store-scoped cho WarehouseStaff), `getPurchaseOrderById`, `confirmReceipt` (WarehouseStaff, gọi `InventoryService.updateInventory(storeId, productId, receivedQuantity, 'increase')` — đã verify đúng signature, đúng dùng `receivedQuantity` thực nhận không phải `quantity` đặt ban đầu), `cancelPurchaseOrder` (Manager, chỉ huỷ được khi `status='pending'`)
- `supplier.controller.ts` — `getSuppliers` (mọi role đã login), `createSupplier` (Manager); **không theo convention chuẩn** — thiếu `return;` sau mỗi `res.json()`/`res.status()`, dùng `catch (error) { console.error(...) }` thay vì `catch {}` không bind (xem Known issues #10)
- `stock-transfer.controller.ts` — `getTransfers` (mọi role đã login, filter tùy chọn `status`/`storeId` khớp `fromStoreId` HOẶC `toStoreId`), `createTransfer` (Manager), `confirmTransfer` (WarehouseStaff) — dùng `catch (err) { if (err instanceof StockTransferServiceError) {...} }`, theo đúng pattern custom-error-class đã ghi nhận tốt ở `purchase-order.controller.ts`

> **Note:** unlike `OrderService`/`InventoryService`, there is no separate `ProductService`/`CategoryService`/`PromotionService` on the backend — `product.controller.ts`/`category.controller.ts`/`promotion.controller.ts` call the Sequelize models directly. This is inconsistent with the layered-service pattern documented above; flagged for future cleanup, not blocking.

> **Ghi nhận cách làm tốt:** `purchase-order.controller.ts` dùng `catch (err) { if (err instanceof PurchaseOrderServiceError) {...} }` — custom error class mang `statusCode` riêng, cho phép trả đúng status code (400/404/409) thay vì luôn 500 chung. Khác với pattern `catch {}` không bind đã ghi ở mục "TypeScript notes", nhưng đây là **cải tiến có chủ đích**, không phải lệch convention cần sửa. Nên cân nhắc áp dụng lại cho `customer.controller.ts`/`order.controller.ts` sau này.

> **Note:** unlike `OrderService`/`InventoryService`, there is no separate `ProductService`/`CategoryService`/`PromotionService` on the backend — `product.controller.ts`/`category.controller.ts`/`promotion.controller.ts` call the Sequelize models directly. This is inconsistent with the layered-service pattern documented above; flagged for future cleanup, not blocking.

**Middleware implemented (`middleware/`):**
- `auth.middleware.ts` — verifies Bearer JWT, attaches `req.user`
- `role.middleware.ts` — `roleMiddleware(allowedRoles[])` factory

**Routes implemented (`routes/`):**
- `auth.routes.ts` → `POST /api/auth/login`
- `account.routes.ts` → `GET /api/accounts`, `POST /api/accounts`, `PUT /api/accounts/:id`
- `store.routes.ts` → `GET /api/stores`
- `inventory.routes.ts` → `GET /api/inventory`, `GET /api/inventory/low-stock`, `PATCH /api/inventory` (WarehouseStaff only)
- `product.routes.ts` → `GET /api/products/search`, `GET /api/products` (auth only), `POST /api/products`, `PUT /api/products/:id`, `DELETE /api/products/:id` (last 3 are Manager-only)
- `category.routes.ts` → `GET /api/categories` (auth only — no mutation routes exist)
- `promotion.routes.ts` → `GET /api/promotions` (auth only), `POST /api/promotions`, `PUT /api/promotions/:id` (= deactivate, **not** general update — Manager-only on both)
- `customer.routes.ts` → `GET /api/customers`, `POST /api/customers` (Staff, Manager)
- `loyaltyPointRoutes.ts` → `GET /api/loyalty-points/balance`, `POST /api/loyalty-points/redeem` (auth only, mọi role — không giới hạn theo `roleMiddleware`)
- `order.routes.ts` → `POST /api/invoices`, `POST /api/invoices/:id/items`, `DELETE /api/invoices/:id/items/:productId`, `POST /api/invoices/:id/promotion`, `POST /api/invoices/:id/confirm-payment` (all Staff only), `GET /api/invoices` (Staff, Manager)
- `purchase-order.routes.ts` → `GET /api/purchase-orders` (Manager + WarehouseStaff), `GET /api/purchase-orders/:id` (Manager + WarehouseStaff), `POST /api/purchase-orders` (**Manager only**), `PUT /api/purchase-orders/:id/confirm` (**WarehouseStaff only**), `PUT /api/purchase-orders/:id/cancel` (**Manager only**) — phân quyền tách theo từng hành động, đã verify đúng Schema.md mục 7 (khác SP-KM toàn bộ Manager-only)
- `supplier.routes.ts` → `GET /api/suppliers` (auth only), `POST /api/suppliers` (Manager)
- `stock-transfer.routes.ts` → `GET /api/stock-transfers` (auth only, mọi role), `POST /api/stock-transfers` (**Manager only** — khởi tạo phiếu), `PUT /api/stock-transfers/:id/confirm` (**WarehouseStaff only** — xác nhận nhận hàng tại `toStoreId`)

**Services implemented (`services/`):**
- `InventoryService.ts` — `updateInventory(storeId, productId, quantity, mode)`, `checkLowStock(storeId?)`, `getStockByStore(storeId)`, `checkStock(...)`
- `OrderService.ts` — `createOrder`, `addItem` (upserts by productId, throws `'Tồn kho không đủ'` via `InventoryService.checkStock`), `removeItem`, `applyPromotion` (no-op discount=0 + 200 response if `Promotion.isValid()` fails — **not** an HTTP error), `confirmPayment` (throws `'Số tiền không đủ'` if `amount < totalAmount`, decrements inventory per line, awards `floor(totalAmount / 10000)` loyalty points if `customerId` is set); `recalculateSubtotal` (private, gọi lại sau mỗi `addItem`/`removeItem`) giờ có **guard discount**: nếu `invoice.promotionId !== null` hoặc `discountAmount > 0`, tự reset `promotionId=null`/`discountAmount=0`/`totalAmount=subtotal` — xem "Known gap" cũ đã được fix bên dưới
- `LoyaltyPointService.ts` — `addPoints`, `redeemPoints` (returns `false` without mutating if balance insufficient), `getBalance` — đã có HTTP surface qua `loyaltyPointRoutes.ts`/`loyaltyPoint.controller.ts`
- `PurchaseOrderService.ts` — `createPurchaseOrder` (transaction: tạo order + bulk-create details, `totalCost` tính từ `items`), `getPurchaseOrders` (filter `storeId`/`status`/`startDate`/`endDate`; **tham số `search` được nhận nhưng không dùng để filter gì cả** — xem Known issues #8), `getPurchaseOrderById`, `confirmReceipt` (transaction: update từng `receivedQuantity` + gọi `InventoryService.updateInventory(..., 'increase')` dùng chung, không viết riêng), `cancelOrder` (chỉ huỷ khi `status='pending'`)
- `StockTransferService.ts` — `createTransfer` (validate `fromStoreId !== toStoreId` và `quantity > 0`, ném `StockTransferServiceError`), `confirmTransfer` (atomic qua 1 `sequelize.transaction`: `InventoryService.updateInventory(fromStoreId, productId, quantity, 'decrease', t)` rồi `(toStoreId, ..., 'increase', t)` rồi update `status='completed'` — nếu bước nào fail thì cả transaction rollback, không cần rollback tay)

**Fixed (trước đây là "Known gap"):** `OrderService.applyPromotion`/`addItem`/`removeItem` — guard discount đã được thêm vào `recalculateSubtotal` (xem trên). Frontend (`SalesManagement.tsx`) vẫn giữ client-side mitigation riêng (clear local discount khi sửa cart) — không còn bắt buộc về mặt đúng-sai dữ liệu vì backend đã tự bảo vệ, nhưng giữ lại để UX phản hồi tức thì không cần round-trip.

**Known issues — tuần 2:**
1. **`PromotionService.updatePromotion` + `PUT` endpoint thật** — hiện backend chỉ có `createPromotion`/`deactivatePromotion`, không có cách sửa name/value/dates của một khuyến mãi đã tồn tại. Nút "Sửa" trên `PromotionManagement.tsx` đã bị disable tạm (không phải xóa code — `handleOpenEditPromoModal`/`handleSaveEditPromoSubmit`/modal sửa vẫn còn trong file, chỉ unreachable) chờ đến khi có endpoint thật. **Ưu tiên cao** vì đây là tính năng người dùng mong đợi có.
2. **`createProduct` trả lỗi 500 chung khi trùng `sku`** (`product.controller.ts`) — không bắt riêng lỗi UNIQUE constraint để trả `409` như pattern đã có ở `customer.controller.ts` (createCustomer trả 409 khi trùng phone).
3. **SKU sinh phía client dễ trùng** (`ProductManagement.tsx handleCreate`: `SP0${products.length+1}`) — dựa vào số lượng sản phẩm đang hiển thị (có thể đã filter/search), nên dễ va với SKU đã tồn tại → rơi vào bug #2 trên, lỗi 500 không rõ nguyên nhân cho người dùng. Nên đổi sang để backend tự sinh SKU hoặc validate trước khi submit.
4. **`category.controller.ts` dùng `catch (error) { console.error(error); ... }`** thay vì pattern `catch { }` không bind error đã thống nhất ở mục "TypeScript notes" (`product.controller.ts`/`promotion.controller.ts` đều tuân thủ đúng).
5. **Dead prop `onAddPromotion`** trong `PromotionManagementProps` (`PromotionManagement.tsx`) — còn khai báo + destructure nhưng không gọi ở đâu (logic mới gọi `createPromotion` service trực tiếp). Nên dọn khi làm gap #1.
6. **Không có `roleMiddleware` trên `category.routes.ts`** — không phải bug (route này chỉ có `GET`, mở cho mọi role đã login là đúng), nhưng nếu sau này thêm route tạo/sửa/xóa category, phải nhớ thêm `roleMiddleware(['Manager'])` theo đúng pattern đã áp dụng cho `product.routes.ts`/`promotion.routes.ts`.
7. **Thiếu try/catch quanh các lời gọi service ở `App.tsx`** — `handleAddProduct`/`handleUpdateProduct`/`handleDeleteProduct` gọi `createProduct`/`updateProduct`/`deleteProduct` (từ `services/product.service.ts`) không có try/catch. Nếu backend trả lỗi (404, 409, 500...), promise reject không được bắt → unhandled rejection, không có thông báo nào cho người dùng. Khác với `PromotionManagement.tsx` đã có try/catch + `alert(...)` quanh `createPromotion`/`deactivatePromotion`. Cần chuẩn hóa xử lý lỗi khi đụng tới các hàm này lần sau.
8. **`PurchaseOrderService.getPurchaseOrders` nhận `search` param nhưng không filter gì** — controller destructure và truyền `search` xuống service, nhưng trong `where` clause của service không có dòng nào dùng `params.search`. Không gây lỗi runtime (không phải bug), chỉ là tham số chết — nếu sau này có frontend gửi `?search=...` sẽ không có tác dụng gì mà cũng không báo lỗi. Cần bổ sung logic search (ví dụ ILIKE trên tên supplier) khi làm frontend cho module này.
9. ~~`stock_transfers` vẫn chưa được phân công~~ — **đã xong**: model/service/controller/route/frontend đầy đủ (xem các mục tương ứng ở trên). `StockTransferManagement.tsx` đã wire vào `App.tsx` cho Manager + WarehouseStaff.
10. **`supplier.controller.ts` không theo convention chuẩn** — thiếu `return;` sau mỗi `res.json()`/`res.status()` (có thể response tiếp tục chạy xuống code dưới dù controller hiện tại không có gì sau đó nên chưa gây lỗi thật, nhưng dễ thành bug nếu thêm logic), và dùng `catch (error) { console.error(error); ... }` thay vì `catch {}` không bind — cùng vấn đề đã ghi ở #4 cho `category.controller.ts`. Nên chuẩn hóa khi sửa `supplier.controller.ts` lần sau.
11. **`/api/loyalty-points` từng bị rớt mount khi merge** — conflict trên `backend/src/server.ts` giữa branch `Bán-hàng` (thêm mount loyalty-points) và `main` (đã có category/promotion/purchase-order/supplier/stock-transfer) khiến dòng mount loyalty-points bị mất trong merge commit, dù file `loyaltyPoint.controller.ts`/`loyaltyPointRoutes.ts` vẫn tồn tại. Đã phát hiện và fix lại. **Bài học:** khi resolve conflict trên `server.ts`, phải so cả 2 phía đầy đủ — không chỉ lấy 1 bên — vì mỗi nhánh thường chỉ thêm 1-2 dòng mount riêng.

### Frontend (`frontend/src/`)
All application state lives in `App.tsx` via React hooks — no Redux or Context. Feature components are passed state and callbacks as props.
- `App.tsx` — Root component; owns all state, routing logic, login/role gating; session persisted in `localStorage`
- `types.ts` — All shared TypeScript interfaces; includes `ApiAccount`, `ApiStore`, `AuthUser`, `ApiCustomer`, `ApiPromotion`, `ApiInvoice`, `ApiInvoiceDetail`, `ApiProduct` (the original mock-shaped `Product`/`Customer`/`Promotion`/`Invoice` interfaces still exist too — kept only so unmigrated components and unused prop signatures still compile, do not use them for new API-backed work)
- `utils/roleMapping.ts` — `roleLabels` (enum → Vietnamese), `roleLabelToEnum` (Vietnamese → enum), `defaultTabByRole`
- `data.ts` — Mock data still used by components not yet migrated
- `components/` — One file per business domain

**Frontend API service layer (`services/`)** — convention mới, áp dụng cho code Sản phẩm/Danh mục/Khuyến mãi trở đi:
- `product.service.ts`, `category.service.ts`, `promotion.service.ts`, `customer.service.ts`, `stock-transfer.service.ts` — dùng `axios` (không phải `fetch()` thô như `AccountManagement.tsx`/`SalesManagement.tsx`), mỗi service file export các hàm gọi API tương ứng 1 resource, tự đính `Authorization` header từ `localStorage.getItem('token')`.
- **Đây là pattern chính thức cho module mới** kể từ branch SP-KM — không bắt buộc đồng bộ lại `AccountManagement.tsx`/`SalesManagement.tsx` sang pattern này ngay, nhưng module mới nên theo `services/*.service.ts` thay vì `fetch()` trực tiếp trong component.
- `axios` đã được khai báo trong `frontend/package.json` (`^1.18.0`) — bắt buộc `npm install` lại sau khi pull nếu chưa có trong `node_modules`.
- **Lưu ý xử lý lỗi chưa nhất quán:** một số call site có try/catch quanh các hàm service (vd. `PromotionManagement.tsx`), một số không (vd. `App.tsx handleAddProduct/handleUpdateProduct/handleDeleteProduct` — xem "Known issues — tuần 2" #7) — lỗi HTTP sẽ là unhandled rejection, không có thông báo cho người dùng. Cần chuẩn hóa khi viết thêm service mới.

**Components connected to real API:**
- `AccountManagement.tsx` — fetches `GET /api/accounts` + `GET /api/stores`; POST create, PUT edit/toggle
- `SalesManagement.tsx` — full POS flow against `/api/invoices`, `/api/products/search`, `/api/customers`. Receives the old mock props (`products`, `customers`, `promotions`, `onAddInvoice`, etc.) to keep `App.tsx` unchanged, but destructures them with `_` prefixes and never reads them — everything is fetched fresh. Starts a new draft invoice on mount (`POST /api/invoices`); add/quantity-change both funnel through one `submitItem` helper that calls `POST /api/invoices/:id/items` (upsert); editing the cart after a promotion was applied clears the local discount and requires manual re-apply.
- `OrderHistory.tsx` — Staff "Lịch sử đơn hàng" tab; `GET /api/invoices` with `startDate`/`endDate`/`search`; today's order count/revenue computed client-side from the fetched list (no extra request); detail modal + `window.print()`-based invoice printing. Replaced `ReportView` for this tab.
- `ProductManagement.tsx` — full CRUD qua `services/product.service.ts` + `services/category.service.ts`; search server-side qua `GET /api/products/search`; form tạo/sửa map `categoryId` ↔ `categoryName` qua danh sách `categories` (props từ `App.tsx`); xóa = soft delete (`isActive=false`), label nút vẫn ghi "Xóa" trên UI dù backend chỉ vô hiệu hóa.
- `PromotionManagement.tsx` — list + create qua `services/promotion.service.ts`; nút **"Sửa" bị disable có chủ đích** (title tooltip giải thích) — backend chưa có endpoint update thật, xem "Known issues — tuần 2" #1; không có UI chọn sản phẩm cụ thể để áp dụng khuyến mãi theo `productId` — mọi khuyến mãi tạo từ UI này đều là loại "toàn đơn hàng".
- `CustomerManagement.tsx` — list + create qua `services/customer.service.ts` (`searchCustomers`/`createCustomer`); map `ApiCustomer → Customer` cục bộ trong component (`fullName→name`, `loyaltyPoints.points`, `memberLevel→tier` qua `mapTier()` fallback `'Đồng'` nếu null, `createdAt→joinDate`); filter theo tier/search vẫn chạy client-side trên data đã fetch (không gọi API lại mỗi lần đổi filter). Nút **"Sửa" bị disable có chủ đích** (cùng pattern `PromotionManagement.tsx`) vì backend chỉ có `GET`/`POST /api/customers`, không có `PUT` để update — modal/handler sửa vẫn còn trong file, chỉ unreachable. Modal "Thêm khách hàng" đã bỏ 2 input Hạng/Điểm khởi tạo vì backend không nhận field này (luôn tạo `loyalty_points` với `points=0`). Props `customers`/`onAddCustomer` từ `App.tsx` vẫn giữ trong interface nhưng là dead prop (không gọi) — cùng tình trạng `onAddPromotion` ở #5 dưới.
- `StockTransferManagement.tsx` — qua `services/stock-transfer.service.ts`; wired vào `App.tsx` cho cả Manager (tạo phiếu) và WarehouseStaff (xác nhận nhận hàng).

**Components still using mock data (not yet migrated):**
- `WarehouseManagement`, `StoreManagement`, `DashboardOverview`, `EmployeeManagement`, `RevenueReport` — `WarehouseManagement` có backend API khả dụng (`/api/inventory`, `/api/purchase-orders`) nhưng chưa wire vào component
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
1. Category CRUD (create/update/delete) — only `GET /api/categories` exists today; Products CRUD itself is done (see Controllers/Routes above)
2. `PromotionService.updatePromotion` + `PUT` endpoint thật (Known issues — tuần 2 #1) — `CustomerManagement.tsx` cần tương tự (update customer), xem Known issues #11 không áp dụng đây mà là API thật chưa có `PUT /api/customers/:id`
3. Hardening cho `product.controller.ts createProduct`: trả `409` khi trùng `sku` thay vì `500` chung (Known issues — tuần 2 #2)
4. Bổ sung logic filter `search` cho `PurchaseOrderService.getPurchaseOrders` (Known issues — tuần 2 #8) khi có frontend cho module Nhập hàng
5. Chuẩn hóa `supplier.controller.ts` theo convention `return;`/`catch {}` (Known issues #10)

**Backend — đã xong trong tuần này (không còn pending):**
- ~~Loyalty Point routes (redeem/check balance)~~ — `loyaltyPoint.controller.ts` + `loyaltyPointRoutes.ts` đã có, mount tại `/api/loyalty-points` (từng bị rớt khi merge, đã fix — Known issues #11)
- ~~Server-side guard cho `discountAmount`~~ — đã thêm vào `OrderService.recalculateSubtotal`
- ~~Missing model `stock_transfers`~~ — đã xong đầy đủ model/service/controller/route/frontend

**Frontend — migration from mock data:**
- Replace `data.ts` mock calls in each component with real `fetch()`/`services/*.service.ts` calls to the backend APIs, following the pattern of `AccountManagement.tsx`/`SalesManagement.tsx` (fetch) or `ProductManagement.tsx`/`PromotionManagement.tsx`/`CustomerManagement.tsx` (axios service layer)
- `WarehouseManagement` is the natural next target — backend cho Purchase Orders đã có sẵn (`/api/purchase-orders`) nhưng chưa được wire vào component nào. Khi migrate, dùng convention `services/*.service.ts` (axios), và lưu ý lỗi đã gặp ở SP-KM (lẫn ID với tên hiển thị, vd. `supplierId`/`supplierName`, `productId`/`productName`) khi viết code map dữ liệu
- `StoreManagement`, `DashboardOverview`, `EmployeeManagement`, `RevenueReport` still need both backend routes and frontend wiring
