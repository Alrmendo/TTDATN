# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTDATN is a retail chain management system (Vietnamese: Tổ chức Bán lẻ Chuỗi) with a Node.js/Express/TypeScript backend and a React/Vite/TypeScript frontend. **Tuần 5 (22/7/2026) — chuẩn bị deploy (Render + Vercel) + thêm trợ lý AI (Gemini).** Tất cả frontend components đã được wire vào real API: Auth, Account management, Inventory, Customer management, Sales/POS flow, Product/Category/Promotion management, Stock Transfer, Store management, Revenue/Inventory reports (RevenueReport.tsx), Warehouse management (Tồn kho + Đơn nhập hàng), và DashboardOverview (storesCount, bảng "Đơn hàng gần đây", revenue chart today/yesterday/week/month — tất cả đã wire API thật). EmployeeManagement and ReportView have been removed from the codebase.

**Deploy readiness:** toàn bộ URL API phía frontend đã centralize qua `frontend/src/config/api.ts` (đọc `VITE_API_URL`, fallback `http://localhost:5000/api`) — không còn hardcode `http://localhost:5000/api` rải rác, chuẩn bị deploy backend lên Render + frontend lên Vercel. `backend/src/config/database.ts` bật SSL có điều kiện (`dialectOptions.ssl` chỉ thêm khi `DATABASE_URL` chứa `render.com`) để không phá kết nối Postgres local không-SSL. Xem chi tiết ở mục "Frontend API service layer" và "Database Schema" bên dưới.

**Role thứ 4 — BranchManager (Quản lý chi nhánh):** đã có schema/JWT/middleware/seed đầy đủ. **UI không còn là placeholder** — sidebar chỉ còn 1 tab thật "Đơn nhập hàng" (`BranchManagerOrders.tsx`, thay hẳn tab "Tổng quan" cũ hiện thông báo "đang được phát triển"), nghiệp vụ: xác nhận đã đặt hàng với nhà cung cấp (`pending → ordered`) — bước mới chèn vào giữa lúc Manager tạo đơn và lúc WarehouseStaff xác nhận nhận hàng. Xem state machine đầy đủ ở `PurchaseOrderService.ts` bên dưới. Không tạo được tài khoản BranchManager qua `AccountManagement.tsx` (dropdown role ở đó chỉ có Staff/WarehouseStaff/Manager) — hiện chỉ tạo được qua `npm run seed`.

**Trợ lý AI (Gemini function-calling):** khung chat nổi (`AiAssistantWidget.tsx`), chỉ hiện cho Manager + BranchManager, trả lời số liệu kinh doanh thật (qua tool-calling gọi lại `ReportService`/`InventoryService`, không tự viết SQL) và hướng dẫn dùng hệ thống (dựa system prompt mô tả tab thật). Xem mục "AI Assistant" trong Backend bên dưới.

**Regression fixes tuần 5 (2026-07-25, commit "fix: category alias regression, PO/transfer store-scoping, 500->409, add invoice-customer linking"):** phát hiện qua bộ test tầng API tự viết (119 test case, xem `TEST_RESULTS.md` — file tạm, không track git, chỉ để tham khảo lần chạy gần nhất). Đã fix 3 việc: (1) `GET /api/inventory?storeId=` trả 500 do thiếu `as: 'category'` sau khi `Inventory.service.ts` đổi sang class; (2) lỗ hổng phân quyền — WarehouseStaff xem/xác nhận được đơn nhập hàng và phiếu điều chuyển của chi nhánh khác qua route "theo id" (list đã store-scoped đúng nhưng route theo id thì không); (3) xác nhận điều chuyển vượt tồn kho trả 500 thay vì 409. Đồng thời thêm mới `PATCH /api/invoices/:id/customer` để gắn khách hàng vào hóa đơn draft trước khi thanh toán (trước đó không có API nào làm việc này, nên điểm tích lũy không cộng được nếu Staff chọn khách hàng ở UI mà chưa từng lưu xuống server). Xem chi tiết từng chỗ ở "Known issues — tuần 5" bên dưới.

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
| `promotion.model.ts` | `promotions` | `type` ENUM('percentage','fixed'); nullable `productId` FK (NULL = whole-order promo); `isValid(orderValue)` and `calculateDiscount(amount)` instance methods — cả 2 đã fix tuần 5 để `Number()`-coerce `minOrderValue`/`value` tường minh (DECIMAL về từ Postgres là string, so sánh/nhân trực tiếp trước đây có thể sai) |
| `loyalty-point.model.ts` | `loyalty_points` | `customerId` NOT NULL + UNIQUE FK → `customers.id` (1:1); no `createdAt` |
| `supplier.model.ts` | `suppliers` | actor ngoài hệ thống, chỉ lưu thông tin liên hệ, không có tài khoản đăng nhập |
| `purchase-order.model.ts` | `purchase_orders` | `status` ENUM('pending','ordered','debt','completed','cancelled') — **`'debt'` thêm tuần 5**, **`'ordered'` thêm sau đó** (commit "add BranchManager confirm-order step (pending->ordered) to PurchaseOrder flow") chèn giữa `pending` và `debt`/`completed`, xem state machine đầy đủ 5 trạng thái bên dưới; `confirmedBy`/`confirmedAt` nullable cho tới khi `confirmReceipt()`; `totalCost` tính trong `PurchaseOrderService.createPurchaseOrder`/`confirmReceipt` (không phải instance method `calculateTotalCost()` như Schema.md mục 7 mô tả — lệch vị trí đặt logic, không lệch kết quả; **Schema.md cũng chưa được cập nhật cho `'debt'`/`'ordered'`**, xem "What Still Needs to Be Built") |
| `purchase-order-detail.model.ts` | `purchase_order_details` | `receivedQuantity` nullable, NULL cho tới khi `confirmReceipt()` set — đúng Schema.md mục 8; có `getSubtotal()` instance method |
| `purchase-order-payment.model.ts` | `purchase_order_payments` | **mới tuần 5**, không có trong Schema.md (bảng thứ 15, ngoài 14 bảng liệt kê ở "Database Schema"); cột: `id`, `purchaseOrderId` FK, `amount` DECIMAL, `paidAt` (default `now()`), `userId` FK (Manager ghi nhận thanh toán); `timestamps: false` |
| `stock-transfer.model.ts` | `stock_transfers` | `status` ENUM('pending','completed'); `confirmedBy`/`confirmedAt` nullable cho tới khi `confirmTransfer()`; không có `updatedAt` |

**Missing models:** không còn — tất cả 14 bảng trong Schema.md đã có model (`purchase_order_payments` là bảng thứ 15, có model thật nhưng chưa được thêm vào Schema.md — xem "What Still Needs to Be Built").

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
- `PurchaseOrder` ↔ `PurchaseOrderPayment` (1:N, as `payments`, `onDelete: CASCADE`) — **mới tuần 5**; khai báo có nhưng **không được dùng** ở đâu (`PurchaseOrderPaymentService` tự `PurchaseOrderPayment.findAll({ where: { purchaseOrderId } })` thay vì qua `order.getPayments()`/`include`) — alias tồn tại nhưng là dead association, không phải lỗi
- `PurchaseOrderPayment` ↔ `User` (N:1, as `payer` cho `userId`) — **mới tuần 5**
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
- `order.controller.ts` — `createOrder`, `addItem` (422 on `'Tồn kho không đủ'`), `removeItem`, `setInvoiceCustomer` (**mới tuần 5, PATCH `/api/invoices/:id/customer`**, Staff — gắn `customerId` vào hóa đơn còn `draft`; 404 nếu không tìm thấy hóa đơn/khách hàng, 409 nếu hóa đơn không còn ở trạng thái `draft`), `applyPromotion` (manual apply by `promotionId`, vẫn giữ nguyên cho khả năng gọi tay), `applyBestPromotion` (**mới tuần 5**, gọi `OrderService.selectBestPromotion` rồi `applyPromotion`; trả `{ discountAmount: 0, totalAmount: subtotal, promotionName: null }` nếu không có KM nào hợp lệ — không phải lỗi HTTP), `confirmPayment` (422 on `'Số tiền không đủ'`), `getInvoices` (role-scoped: Staff forced to own store, Manager optional `storeId`; supports `startDate`/`endDate`/`search`; includes `invoiceDetails`/`customer`/`staff`/`promotion`/`store` — `store` được thêm tuần 3 để trả `storeName` cho DashboardOverview)
- `purchase-order.controller.ts` — `createPurchaseOrder` (Manager), `getPurchaseOrders` (Manager + WarehouseStaff + **BranchManager**, store-scoped cho cả WarehouseStaff và BranchManager — cùng nhánh `if (role === 'WarehouseStaff' || role === 'BranchManager') storeId = userStoreId`), `getPurchaseOrderById` (**tuần 5 fix:** WarehouseStaff nay bị chặn 403 nếu đơn không thuộc chi nhánh mình — trước đó lộ dữ liệu chi nhánh khác qua `GET /:id` dù `getPurchaseOrders` list đã store-scoped đúng; **BranchManager** dùng chung check này trong `PurchaseOrderService`), `confirmOrder` (**mới, `PUT /:id/confirm-order`, BranchManager only** — gọi `PurchaseOrderService.confirmOrdered`, chuyển `pending → ordered`), `confirmReceipt` (WarehouseStaff, gọi `InventoryService.updateInventory(storeId, productId, receivedQuantity, 'increase')` — đã verify đúng signature, đúng dùng `receivedQuantity` thực nhận không phải `quantity` đặt ban đầu; **tuần 5:** chuyển `status` sang `'debt'` thay vì `'completed'` trực tiếp — xem state machine ở `PurchaseOrderService.ts`; **tuần 5 fix:** cũng chặn 403 nếu `callerStoreId` không khớp `order.storeId` — trước đó WarehouseStaff chi nhánh A có thể confirmReceipt đơn của chi nhánh B, tăng nhầm tồn kho sai chi nhánh; **thêm sau đó:** nay còn yêu cầu `order.status === 'ordered'` — không cho xác nhận nhận hàng thẳng từ `'pending'` nữa, phải qua bước BranchManager `confirmOrder` trước), `cancelPurchaseOrder` (Manager, huỷ được khi `status` là `'pending'` HOẶC `'ordered'` — mở rộng từ chỉ `'pending'` để Manager vẫn huỷ được đơn đã qua bước BranchManager nhưng chưa nhận hàng)
- `purchase-order-payment.controller.ts` — **mới tuần 5**: `getPurchaseOrderPaymentSummary` (`GET /:id/payments`, Manager + WarehouseStaff — trả `{ totalCost, totalPaid, remainingDebt, payments[] }`), `recordPurchaseOrderPayment` (`POST /:id/payments`, **Manager only** — validate `amount` là số dương, gọi `PurchaseOrderPaymentService.recordPayment`)
- `supplier.controller.ts` — `getSuppliers` (mọi role đã login), `createSupplier` (Manager); **không theo convention chuẩn** — thiếu `return;` sau mỗi `res.json()`/`res.status()`, dùng `catch (error) { console.error(...) }` thay vì `catch {}` không bind (xem Known issues #10)
- `stock-transfer.controller.ts` — `getTransfers` (mọi role đã login, filter tùy chọn `status`/`storeId` khớp `fromStoreId` HOẶC `toStoreId`), `createTransfer` (Manager), `confirmTransfer` (WarehouseStaff) — dùng `catch (err) { if (err instanceof StockTransferServiceError) {...} }`, theo đúng pattern custom-error-class đã ghi nhận tốt ở `purchase-order.controller.ts`; **tuần 5 fix:** truyền thêm `callerStoreId` cho `StockTransferService.confirmTransfer` để chặn 403 nếu WarehouseStaff không thuộc đúng `toStoreId` (trước đó WarehouseStaff chi nhánh không liên quan vẫn confirm được, lộ 200); cũng bắt thêm `InventoryServiceError` để trả đúng `err.statusCode` (409 khi tồn kho không đủ lúc confirm) thay vì rơi xuống `500` chung
- `report.controller.ts` — `getRevenueReport` (`GET /api/reports/revenue`; hỗ trợ `mode=month|quarter|year` (kèm `month`/`quarter`+`year`) hoặc mặc định `startDate`/`endDate`; validate `startDate <= endDate`), `getInventoryReport` (`GET /api/reports/inventory?storeId=`, `storeId` optional = toàn hệ thống); cả 2 chỉ gọi `ReportService` (`services/report.service.ts`), không viết query riêng; Manager-only qua `roleMiddleware(['Manager'])`
- `ai.controller.ts` — `chat` (`POST /api/ai/chat`, Manager + BranchManager): nhận `{ message: string }`, chạy vòng lặp Gemini function-calling (tối đa 5 round) qua SDK `@google/genai`; tool declarations + executor nằm ở `services/ai-tools.service.ts`; tự fallback sang model `gemini-flash-lite-latest` (đúng 1 lần/request, không lặp) nếu model chính `gemini-flash-latest` ném `ApiError` với `status === 429` (quota/rate-limit thật của Gemini API — xem type `ApiError` trong `@google/genai`); system prompt tự chèn ngày hiện tại (để tính đúng "tháng này"/"quý này"/"năm nay") + đoạn ép buộc riêng cho BranchManager: phải mô tả số liệu đúng là của riêng chi nhánh họ (không nói "toàn hệ thống") dù bị yêu cầu "bỏ qua giới hạn"; trả `{ reply: string }`. **Cập nhật (BranchManager confirm-order):** đoạn mô tả vai trò BranchManager trong `buildSystemPrompt()` không còn ghi "chỉ có tab Tổng quan placeholder, chưa có nghiệp vụ thật" — đã sửa thành mô tả đúng nghiệp vụ thật: xác nhận đã đặt hàng với nhà cung cấp (`pending → ordered`), store-scoped đúng chi nhánh; verify thật qua `POST /api/ai/chat` — AI trả lời đúng mô tả này khi được hỏi, không còn nói "chưa có chức năng".

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
- `order.routes.ts` → `POST /api/invoices`, `POST /api/invoices/:id/items`, `DELETE /api/invoices/:id/items/:productId`, `PATCH /api/invoices/:id/customer` (**mới tuần 5** — gắn khách hàng vào hóa đơn còn `draft`), `POST /api/invoices/:id/promotion`, `POST /api/invoices/:id/promotion/auto` (**mới tuần 5** — auto chọn KM tốt nhất, gọi bởi `SalesManagement.tsx` sau mỗi lần sửa giỏ hàng), `POST /api/invoices/:id/confirm-payment` (all Staff only), `GET /api/invoices` (Staff, Manager)
- `purchase-order.routes.ts` → `GET /api/purchase-orders` (Manager + WarehouseStaff + **BranchManager**, store-scoped), `GET /api/purchase-orders/:id` (Manager + WarehouseStaff + **BranchManager**, store-scoped), `POST /api/purchase-orders` (**Manager only**), `PUT /api/purchase-orders/:id/confirm-order` (**mới, BranchManager only** — `pending → ordered`, đặt route TRƯỚC `PUT /:id/confirm` trong file để tránh mọi nhầm lẫn thứ tự match), `PUT /api/purchase-orders/:id/confirm` (**WarehouseStaff only** — nay chỉ chạy được khi đơn đã `ordered`), `PUT /api/purchase-orders/:id/cancel` (**Manager only**, huỷ được ở `pending` hoặc `ordered`) — phân quyền tách theo từng hành động, đã verify đúng Schema.md mục 7 (khác SP-KM toàn bộ Manager-only); **tuần 5:** thêm `GET /api/purchase-orders/:id/payments` (Manager + WarehouseStaff — xem lịch sử/công nợ) và `POST /api/purchase-orders/:id/payments` (**Manager only** — ghi nhận 1 lần thanh toán)
- `supplier.routes.ts` → `GET /api/suppliers` (auth only), `POST /api/suppliers` (Manager)
- `stock-transfer.routes.ts` → `GET /api/stock-transfers` (auth only, mọi role), `POST /api/stock-transfers` (**Manager only** — khởi tạo phiếu), `PUT /api/stock-transfers/:id/confirm` (**WarehouseStaff only** — xác nhận nhận hàng tại `toStoreId`)
- `report.routes.ts` → `GET /api/reports/revenue`, `GET /api/reports/inventory` (cả 2 Manager-only)
- `ai.routes.ts` → `POST /api/ai/chat` (auth + `roleMiddleware(['Manager','BranchManager'])`)

**Services implemented (`services/`):**
- `InventoryService.ts` — `updateInventory(storeId, productId, quantity, mode)`, `checkLowStock(storeId?)`, `getStockByStore(storeId)`, `checkStock(...)`
- `OrderService.ts` — `createOrder`, `addItem` (upserts by productId, throws `'Tồn kho không đủ'` via `InventoryService.checkStock`), `removeItem`, `setCustomer(invoiceId, customerId)` (**mới tuần 5**, gắn `customerId` vào hóa đơn — throws `'Không tìm thấy hóa đơn'`/`'Không tìm thấy khách hàng'` (404) hoặc `'Chỉ có thể gắn khách hàng khi hóa đơn còn ở trạng thái nháp'` (409) nếu `invoice.status !== 'draft'`; lý do chặn ở `draft`: để `confirmPayment` sau đó cộng điểm tích lũy đúng cho khách hàng thật đã chọn, không gắn "hồi tố" sau khi đã `completed`), `applyPromotion` (no-op discount=0 + 200 response if `Promotion.isValid()` fails — **not** an HTTP error), `selectBestPromotion(invoiceId)` (**mới tuần 5**, static, chỉ đọc không ghi DB: lọc `Promotion.isActive=true` + trong khoảng `[startDate, endDate]`, tính discount thực tế từng KM hợp lệ theo `subtotal` hóa đơn — KM theo `productId` cụ thể chỉ tính trên dòng `InvoiceDetail` khớp sản phẩm đó — rồi trả `promotionId` có discount lớn nhất, `null` nếu không có KM nào hợp lệ), `confirmPayment` (throws `'Số tiền không đủ'` if `amount < totalAmount`; **mới tuần 5:** nếu hóa đơn chưa có `promotionId` thì tự gọi `selectBestPromotion` → `applyPromotion` trước khi chốt, rồi re-check lại `amount` với `totalAmount` mới sau khi giảm giá — nếu Staff đã tự áp KM tay từ trước thì bỏ qua bước auto-apply này; decrements inventory per line, awards `floor(totalAmount / 10000)` loyalty points if `customerId` is set); `recalculateSubtotal` (private, gọi lại sau mỗi `addItem`/`removeItem`) giờ có **guard discount**: nếu `invoice.promotionId !== null` hoặc `discountAmount > 0`, tự reset `promotionId=null`/`discountAmount=0`/`totalAmount=subtotal` — xem "Known gap" cũ đã được fix bên dưới
- `LoyaltyPointService.ts` — `addPoints`, `redeemPoints` (returns `false` without mutating if balance insufficient), `getBalance` — đã có HTTP surface qua `loyaltyPointRoutes.ts`/`loyaltyPoint.controller.ts`
- `PurchaseOrderService.ts` — `createPurchaseOrder` (transaction: tạo order + bulk-create details, `totalCost` tính từ `items`), `getPurchaseOrders` (filter `storeId`/`status`/`startDate`/`endDate`/`search` — search dùng `unaccent()` trên tên NCC, xem Known issues tuần 2 #8), `getPurchaseOrderById(id, caller: { role, storeId })` (**tuần 5 fix — signature đổi:** nay nhận thêm `caller`, throw `PurchaseOrderServiceError('...chi nhánh khác', 403)` nếu `(caller.role === 'WarehouseStaff' || caller.role === 'BranchManager')` và `order.storeId !== caller.storeId` — trước đó không nhận tham số này, WarehouseStaff xem được cả đơn chi nhánh khác qua `GET /:id` dù list đã store-scoped đúng; check mở rộng thêm `BranchManager` khi role này có nghiệp vụ thật), **`confirmOrdered(id, caller: { role, storeId })`** (**mới** — BranchManager xác nhận đã đặt hàng với nhà cung cấp; throw 403 nếu `caller.role !== 'BranchManager'` hoặc `order.storeId !== caller.storeId`; throw 409 nếu `order.status !== 'pending'`; set `status='ordered'`), `confirmReceipt` (transaction: update từng `receivedQuantity` + gọi `InventoryService.updateInventory(..., 'increase')` dùng chung, không viết riêng; tính lại `totalCost` từ `receivedQuantity` thực nhận — **tuần 5:** nếu `totalCost <= 0` (vd toàn bộ dòng nhận 0) thì set `status='completed'` thẳng, ngược lại `status='debt'` — tránh đơn kẹt vĩnh viễn ở `'debt'` vì `recordPayment` yêu cầu `amount > 0` nên không có đường tới `'completed'` nếu cứ set `'debt'` cho đơn nợ 0 đồng; **tuần 5 fix:** `ConfirmReceiptInput` thêm field `callerStoreId`, throw 403 nếu `order.storeId !== input.callerStoreId` — cùng lỗ hổng như `getPurchaseOrderById`, trước đó WarehouseStaff chi nhánh A confirmReceipt được đơn chi nhánh B; **thêm sau đó:** giờ throw 409 nếu `order.status !== 'ordered'` — không còn chấp nhận xác nhận nhận hàng thẳng từ `'pending'`, bắt buộc phải qua `confirmOrdered` của BranchManager trước), `cancelOrder` (huỷ được khi `status` là `'pending'` HOẶC `'ordered'` — **mở rộng từ chỉ `'pending'`** để không khoá Manager lại nếu đơn đã qua bước BranchManager nhưng WarehouseStaff chưa nhận hàng) — **state machine đầy đủ 5 trạng thái:** `pending` → (`confirmOrdered`, BranchManager đúng chi nhánh) → `ordered` → (`confirmReceipt`, WarehouseStaff đúng chi nhánh) → `debt` hoặc thẳng `completed` nếu không có gì để nợ; `pending`/`ordered` → (`cancelOrder`, Manager) → `cancelled`; `debt` → (`PurchaseOrderPaymentService.recordPayment`, trả đủ) → `completed`
- `PurchaseOrderPaymentService.ts` — **mới tuần 5**, "công nợ nhà cung cấp": `getPaymentSummary(purchaseOrderId)` (tính `totalPaid`/`remainingDebt` từ tổng `PurchaseOrderPayment.amount`), `recordPayment({ purchaseOrderId, amount, userId })` (transaction + `LOCK.UPDATE` chống race 2 lần trả cùng lúc vượt tổng nợ; chỉ nhận khi `status` là `'debt'` hoặc `'completed'`; từ chối nếu `amount` vượt `remainingDebt` hoặc đơn đã trả đủ (409); tự chuyển `status='completed'` khi `totalPaid` đạt `totalCost` trong dung sai `0.005`) — cho phép trả nhiều lần/partial
- `StockTransferService.ts` — `createTransfer` (validate `fromStoreId !== toStoreId` và `quantity > 0`, ném `StockTransferServiceError`), `confirmTransfer(transferId, confirmedBy, callerStoreId)` (**tuần 5 fix — signature đổi:** thêm tham số `callerStoreId`, throw `StockTransferServiceError('...đúng chi nhánh của mình', 403)` nếu `transfer.toStoreId !== callerStoreId` — trước đó WarehouseStaff chi nhánh không liên quan vẫn confirm được phiếu điều chuyển giữa 2 chi nhánh khác; atomic qua 1 `sequelize.transaction`: `InventoryService.updateInventory(fromStoreId, productId, quantity, 'decrease', t)` rồi `(toStoreId, ..., 'increase', t)` rồi update `status='completed'` — nếu bước nào fail thì cả transaction rollback, không cần rollback tay; lỗi tồn kho không đủ ở bước `decrease` ném `InventoryServiceError` (409) — controller đã bắt riêng để không rơi xuống `500` chung, xem `stock-transfer.controller.ts`)
- `report.service.ts` (default export `ReportService`) — `getRevenueReport(startDate, endDate, storeId?)` (trả `totalRevenue`/`totalOrders`/`dailyRevenue`/`topProducts` top-5), `getMonthlyBreakdown(year, startMonth, endMonth, storeId?)` (private, dùng chung cho 3 hàm dưới), `getMonthRevenue`/`getQuarterRevenue`/`getYearRevenue(..., storeId?)`, `getInventoryReport(storeId?)` (join Product+Store, tính `totalStockValue`/`lowStockCount`); đây là service duy nhất `ai-tools.service.ts` tái sử dụng cho tool `get_revenue_report`/`get_inventory_by_store` — không viết query mới cho AI
- `ai-tools.service.ts` — không phải service nghiệp vụ mới; chỉ khai báo 3 `FunctionDeclaration` cho Gemini (`get_revenue_report`, `get_low_stock_products`, `get_inventory_by_store`) và `executeTool(name, args, caller)` gọi lại đúng `ReportService`/`InventoryService` (`Inventory.service.ts`, không phải `InventoryService.ts` — 2 file khác nhau, xem bảng Services) đã có sẵn; `resolveStoreId(caller, requested)` LUÔN ép `storeId = caller.storeId` khi `caller.role === 'BranchManager'` (bỏ qua `requested` dù AI truyền gì), cho Manager dùng `requested` hoặc để trống = toàn hệ thống. **Tuần 5:** `Inventory.service.ts` đổi từ default-export plain object sang `export class InventoryService` (named export, static methods) — import ở đây và ở `inventory.controller.ts` đã đổi từ `import InventoryService from '...'` sang `import { InventoryService } from '...'` cho khớp; cùng lúc `Inventory.service.ts` cũng thêm method `checkStock()` riêng (dùng `InventoryError`, không throw status 409) — **trùng logic** với `checkStock()` đã có sẵn ở `InventoryService.ts` (dùng `InventoryServiceError`, status 409); bản mới ở `Inventory.service.ts` hiện **không được gọi ở đâu** (chỉ `OrderService.addItem` gọi bản trong `InventoryService.ts`) — xem Known issues tuần 5.

**Fixed (regression, tuần 5):** đổi sang class kéo theo `getStockByStore` trong `Inventory.service.ts` mất `as: 'category'` trên include `Category` (chỉ còn `{ model: Category, attributes: [...] }`) — vì `Product`↔`Category` association khai báo `as: 'category'` (xem "Associations" ở trên), Sequelize không tự khớp include không alias, khiến `GET /api/inventory?storeId=` trả `500`. Đã thêm lại `as: 'category'` vào include.

**Fixed (trước đây là "Known gap"):** `OrderService.applyPromotion`/`addItem`/`removeItem` — guard discount đã được thêm vào `recalculateSubtotal` (xem trên). **Cập nhật tuần 5:** frontend không còn tự "clear local discount + yêu cầu áp lại tay" nữa — `SalesManagement.tsx` gọi `POST /api/invoices/:id/promotion/auto` sau mỗi lần sửa giỏ để server tự tìm lại KM tốt nhất (`OrderService.selectBestPromotion`), nên UI luôn phản ánh đúng KM hợp lệ nhất tại thời điểm hiện tại mà không cần thao tác thủ công.

**Known issues — tuần 2:**
1. ~~**`PromotionService.updatePromotion` + `PUT` endpoint thật**~~ — **đã xong tuần 3**: `updatePromotion` controller + `PUT /api/promotions/:id` đã có, nút "Sửa" trên `PromotionManagement.tsx` đã được kích hoạt.
2. ~~**`createProduct` trả lỗi 500 chung khi trùng `sku`**~~ — **đã xong**: `createProduct` (`product.controller.ts`) không còn nhận `sku` từ request body — tự gọi `generateSku()` (query `Product` có `sku` lớn nhất, tăng dần `SP0001`, `SP0002`...) và bọc insert trong `try/catch` bắt riêng `UniqueConstraintError` để trả `409` kèm message rõ ràng, không rơi xuống `500` chung. **Sửa thêm trong lúc verify (tuần 5):** `generateSku()` trước đó dùng `ORDER BY sku DESC` không lọc — nếu bảng có SKU không đúng format (dữ liệu test cũ dạng `SP001`/`TEST-SKU-...` còn sót trong DB) thì có thể bị chọn nhầm làm "lớn nhất" theo alphabet (`'T' > 'S'`) và sinh ra SKU rác kiểu `SP0NaN`. Đã thêm `where: { sku: { [Op.regexp]: '^SP[0-9]{4}$' } }` để chỉ xét đúng SKU 4 chữ số trước khi `ORDER BY DESC`.
3. ~~**SKU sinh phía client dễ trùng**~~ — **đã xong**: `ProductManagement.tsx handleCreate` không còn tự sinh `SP0${products.length+1}` — form chỉ gửi `productName`/`categoryId`/`price`/`costPrice`, SKU hoàn toàn do backend sinh (xem #2).
4. **`category.controller.ts` dùng `catch (error) { console.error(error); ... }`** thay vì pattern `catch { }` không bind error đã thống nhất ở mục "TypeScript notes" (`product.controller.ts`/`promotion.controller.ts` đều tuân thủ đúng).
5. **Dead prop `onAddPromotion`** trong `PromotionManagementProps` (`PromotionManagement.tsx`) — còn khai báo + destructure nhưng không gọi ở đâu (logic mới gọi `createPromotion` service trực tiếp). Nên dọn khi làm gap #1.
6. ~~**Không có `roleMiddleware` trên `category.routes.ts`**~~ — **đã xử lý tuần 3**: category.routes.ts nay có đầy đủ `POST`/`PUT`/`DELETE` với `roleMiddleware(['Manager'])` theo đúng pattern.
7. **Thiếu try/catch quanh các lời gọi service ở `App.tsx`** — `handleAddProduct`/`handleUpdateProduct`/`handleDeleteProduct` gọi `createProduct`/`updateProduct`/`deleteProduct` (từ `services/product.service.ts`) không có try/catch. Nếu backend trả lỗi (404, 409, 500...), promise reject không được bắt → unhandled rejection, không có thông báo nào cho người dùng. Khác với `PromotionManagement.tsx` đã có try/catch + `alert(...)` quanh `createPromotion`/`deactivatePromotion`. Cần chuẩn hóa xử lý lỗi khi đụng tới các hàm này lần sau.
8. ~~**`PurchaseOrderService.getPurchaseOrders` nhận `search` param nhưng không filter gì**~~ — **đã xong**: `search` filter trên tên nhà cung cấp qua `include` Supplier với `where` dùng `unaccent()` + `Op.iLike` (cùng pattern `sequelizeWhere(fn('unaccent', col(...)), { [Op.iLike]: fn('unaccent', pattern) })` đã có ở `customer.controller.ts searchCustomers`, không viết cách khác) + `required: true` (INNER JOIN, chỉ trả đơn có supplier khớp). Verify thật: search không dấu (`"cong ty"`) vẫn khớp đúng supplier có dấu (`"Công ty..."`).
9. ~~`stock_transfers` vẫn chưa được phân công~~ — **đã xong**: model/service/controller/route/frontend đầy đủ (xem các mục tương ứng ở trên). `StockTransferManagement.tsx` đã wire vào `App.tsx` cho Manager + WarehouseStaff.
10. ~~**`supplier.controller.ts` không theo convention chuẩn`**~~ — **đã xong**: thêm `return;` sau mỗi `res.json()`/`res.status()` ở `getSuppliers`/`createSupplier`, đổi `catch (error) { console.error(error); ... }` thành `catch {}` không bind — thuần refactor convention, hành vi/response shape không đổi (đã verify lại `GET`/`POST /api/suppliers` cho kết quả y hệt trước khi sửa). `category.controller.ts` (#4) vẫn còn nguyên vấn đề tương tự, chưa đụng tới.
11. **`/api/loyalty-points` từng bị rớt mount khi merge** — conflict trên `backend/src/server.ts` giữa branch `Bán-hàng` (thêm mount loyalty-points) và `main` (đã có category/promotion/purchase-order/supplier/stock-transfer) khiến dòng mount loyalty-points bị mất trong merge commit, dù file `loyaltyPoint.controller.ts`/`loyaltyPointRoutes.ts` vẫn tồn tại. Đã phát hiện và fix lại. **Bài học:** khi resolve conflict trên `server.ts`, phải so cả 2 phía đầy đủ — không chỉ lấy 1 bên — vì mỗi nhánh thường chỉ thêm 1-2 dòng mount riêng.

**Known issues — tuần 3:**
1. ~~**`DashboardOverview` gọi sai path**~~ — **đã xong (SP-KM)**: `reportApi.ts` đã dùng `/api/reports/revenue` (có chữ **s**); `DashboardOverview` đã gọi `fetchRevenueReport` cho today/yesterday/week/month, chart SVG hoạt động bình thường.
2. ~~**`DashboardOverview.storesCount` vẫn là mock**~~ — **đã xong**: wire qua `getStores()` trong `services/store.service.ts`, gộp vào `Promise.all` hiện có trong `loadDashboardData`.
3. ~~**`DashboardOverview` bảng "Đơn hàng gần đây" vẫn là mock**~~ — **đã xong**: wire qua `fetch('/api/invoices')` gộp vào cùng `Promise.all` (backend không có `limit`/`status` query param nên lọc `status === 'completed'` + `.slice(0, 5)` phía client); `getInvoices` trong `order.controller.ts` đã bổ sung `include Store` (as `'store'`, attributes `['storeName']`) để trả `storeName` cho Dashboard — trước đó chỉ include `invoiceDetails`/`customer`/`staff`/`promotion`.
4. ~~**`PUT /api/customers/:id` chưa có**~~ — **đã xong**: thêm `updateCustomer` controller (404 nếu không tìm thấy, 409 nếu phone mới trùng customer khác qua pre-check `Op.ne`) + route `PUT /api/customers/:id` với `roleMiddleware(['Staff','Manager'])` khớp đúng quyền với `GET`/`POST`.

**Known issues — tuần 5:**
1. **`checkStock()` trùng lặp giữa 2 file service** — `Inventory.service.ts` vừa thêm `checkStock()` riêng (dùng `InventoryError`, không set status 409) giống hệt ý nghĩa với `checkStock()` đã có sẵn ở `InventoryService.ts` (dùng `InventoryServiceError`, status 409, đang được `OrderService.addItem` gọi thật). Bản mới ở `Inventory.service.ts` hiện chưa được `inventory.controller.ts` hay bất kỳ nơi nào khác gọi tới — dead code, dễ gây nhầm lẫn khi có người sửa nhầm bản không được dùng. Nên xóa bản trùng hoặc hợp nhất về 1 file duy nhất.
2. **`PO_STATUS_LABEL`/`PurchaseOrderStatus` (`types.ts`) chưa được dùng ở đâu** — thêm cùng lúc với commit "PurchaseOrder state machine" nhưng `WarehouseManagement.tsx` (nơi hiển thị status đơn nhập hàng) vẫn tự hardcode label riêng, chưa import 2 export mới này. **Cập nhật:** type ở `types.ts` nay đã đủ 5 trạng thái (`'pending'|'ordered'|'debt'|'completed'|'cancelled'`, khớp `WarehouseManagement.tsx STATUS_MAP` và `BranchManagerOrders.tsx STATUS_BADGE`) nên không còn lệch dữ liệu — nhưng vẫn **chưa có component nào import**, cả 2 file trên vẫn tự khai báo type/label cục bộ riêng. Việc dọn để dùng chung 1 nguồn vẫn còn treo.
3. **`applyPromotion` (manual, `POST /api/invoices/:id/promotion`) không còn được gọi từ UI** — `SalesManagement.tsx` đã bỏ hẳn ô nhập `promotionId` tay, chỉ còn dùng `/promotion/auto`. Endpoint cũ vẫn còn sống ở backend (không lỗi, không cần xóa) nhưng không còn call site nào trên frontend chính thức — cân nhắc giữ lại phòng khi cần override tay, hoặc dọn nếu xác nhận không cần nữa.
4. ~~**`PurchaseOrderService.confirmReceipt` kẹt vĩnh viễn ở `'debt'` khi `totalCost=0`**~~ — **đã fix**: nếu tất cả dòng `receivedQuantity=0` (không có gì để nợ), `totalCost` tính ra `<= 0`; trước đây `status` vẫn set cứng `'debt'`, nhưng `PurchaseOrderPaymentService.recordPayment` yêu cầu `amount > 0` trong khi `remainingDebt` đã là 0 → không có đường nào tới `'completed'`. Đã sửa: `confirmReceipt` set `status = totalCost <= 0 ? 'completed' : 'debt'`. Verify thật: đơn nhận đủ `receivedQuantity=0` → `completed` ngay (không qua `'debt'`); đơn nhận `receivedQuantity>0` bình thường vẫn vào `'debt'` đúng như cũ, trả đủ qua `recordPayment` vẫn chuyển `'completed'` bình thường.
5. **`Schema.md` chưa cập nhật theo commit "Thêm nợ nhà cung cấp, xuất pdf hóa đơn" lẫn commit BranchManager confirm-order sau đó** — §7 `purchase_orders` vẫn ghi `status ENUM('pending','completed','cancelled')` (thiếu cả `'debt'` và `'ordered'`) và mô tả `confirmReceipt` update thẳng `status='completed'` (sai với code thật, xem state machine ở mục Services); không có mục nào cho bảng `purchase_order_payments`; không nhắc gì tới `PurchaseOrderPaymentService`/2 endpoint payments, tính năng xuất PDF, hay bước BranchManager xác nhận đặt hàng (`confirmOrder`/`confirm-order`). Ngoài phạm vi commit này, Schema.md cũng đã lệch từ trước — `role` ENUM chưa có `'BranchManager'`.
6. ~~**`GET /api/inventory?storeId=` trả 500**~~ — **đã fix**: `Inventory.service.ts getStockByStore` thiếu `as: 'category'` trên include `Category` sau khi đổi sang class-based (regression, không phải lỗi cũ) — xem "Fixed (regression, tuần 5)" ở mục Frontend/Backend components trên.
7. ~~**WarehouseStaff xem/xác nhận được đơn nhập hàng và phiếu điều chuyển của chi nhánh khác**~~ — **đã fix (lỗ hổng phân quyền)**: phát hiện qua regression test (`TEST_RESULTS.md`, case #91/#92/#99) — `PurchaseOrderService.getPurchaseOrderById`/`confirmReceipt` và `StockTransferService.confirmTransfer` trước đó không so `caller.storeId`/`callerStoreId` với chi nhánh của đơn/phiếu, dù `getPurchaseOrders`/`getTransfers` (list) đã store-scoped đúng từ trước — chỉ riêng đường "theo id" bị sót. Đã thêm check 403 ở cả 3 hàm.
8. ~~**Xác nhận điều chuyển vượt tồn kho trả 500 thay vì 409**~~ — **đã fix**: `stock-transfer.controller.ts confirmTransfer` giờ bắt thêm `InventoryServiceError` (trước chỉ bắt `StockTransferServiceError`) nên lỗi tồn kho không đủ từ `InventoryService.updateInventory` khi trừ kho nguồn trả đúng `409`.
9. **Khách hàng gắn vào hóa đơn draft không cộng dồn khi hóa đơn đã chuyển trạng thái khác** — `setCustomer` (`OrderService.ts`) chặn cứng 409 nếu `invoice.status !== 'draft'`, có nghĩa là nếu Staff quên chọn khách hàng trước khi thanh toán thì không còn cách nào gắn lại sau đó (hóa đơn đã `completed` sẽ không cộng điểm tích lũy được nữa cho khách). Có chủ đích (tránh gắn hồi tố sai ngữ cảnh điểm tích lũy), không phải bug, nhưng là hạn chế UX cần lưu ý.

### Frontend (`frontend/src/`)
All application state lives in `App.tsx` via React hooks — no Redux or Context. Feature components are passed state and callbacks as props.
- `App.tsx` — Root component; owns all state, routing logic, login/role gating; session persisted in `localStorage`
- `types.ts` — All shared TypeScript interfaces; includes `ApiAccount`, `ApiStore`, `AuthUser`, `ApiCustomer`, `ApiPromotion`, `ApiInvoice`, `ApiInvoiceDetail`, `ApiProduct` (the original mock-shaped `Product`/`Customer`/`Promotion`/`Invoice` interfaces still exist too — kept only so unmigrated components and unused prop signatures still compile, do not use them for new API-backed work). **Tuần 5:** thêm `PurchaseOrderStatus` + `PO_STATUS_LABEL` (map nhãn tiếng Việt) — **cập nhật sau đó:** `PurchaseOrderStatus` nay đủ 5 trạng thái (`'pending'|'ordered'|'debt'|'completed'|'cancelled'`, trước chỉ có 3, thiếu cả `'debt'` lẫn `'ordered'`). Vẫn **chưa có component nào import 2 export này** — `WarehouseManagement.tsx` và `BranchManagerOrders.tsx` đều tự khai báo type/label status cục bộ riêng thay vì dùng chung từ đây; coi như chuẩn bị sẵn cho lần dọn UI đơn nhập hàng tiếp theo, không phải dead code cần xóa.
- `utils/roleMapping.ts` — `roleLabels` (enum → Vietnamese), `roleLabelToEnum` (Vietnamese → enum), `defaultTabByRole` — `BranchManager` đổi từ `'Tổng quan'` sang `'Đơn nhập hàng'` khi tab placeholder bị thay bằng nghiệp vụ thật
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
- `SalesManagement.tsx` — full POS flow against `/api/invoices`, `/api/products/search`, `/api/customers`. Receives the old mock props (`products`, `customers`, `promotions`, `onAddInvoice`, etc.) to keep `App.tsx` unchanged, but destructures them with `_` prefixes and never reads them — everything is fetched fresh. Starts a new draft invoice on mount (`POST /api/invoices`); add/quantity-change both funnel through one `submitItem` helper that calls `POST /api/invoices/:id/items` (upsert). **Tuần 5:** khuyến mãi không còn nhập tay — ô input `promotionId` + nút "Áp dụng" đã bị gỡ; sau mỗi lần sửa giỏ hàng (`addItem`/`removeItem`), `autoApplyPromotion()` tự gọi `POST /api/invoices/:id/promotion/auto` (im lặng, không chặn UI) để server tự chọn KM tốt nhất qua `OrderService.selectBestPromotion`; UI chỉ hiển thị kết quả (`appliedPromotionName` + `promotionResult`) do server trả về, không có state `promotionId` cục bộ nữa. Sau `confirmPayment` thành công, `window.confirm(...)` hỏi có tải PDF hóa đơn không — nếu có, gọi `downloadInvoicePdf()` (xem `utils/invoicePdf.ts`) bằng dữ liệu hóa đơn vừa tạo trên client, không gọi lại API. **Tuần 5 (thêm):** `syncInvoiceCustomer(invoiceId, customerId)` — khi `searchCustomer()` tìm thấy khách hàng, tự gọi `PATCH /api/invoices/:id/customer` ngay (cùng pattern im lặng/không chặn UI với `autoApplyPromotion`, lỗi chỉ `console.error`, không báo Staff) để gắn `customerId` vào hóa đơn draft ở server — trước đó khách hàng chỉ tồn tại ở state cục bộ, `confirmPayment` không có `customerId` nào để cộng điểm tích lũy nếu invoice chưa từng lưu nó.
- `OrderHistory.tsx` — Staff "Lịch sử đơn hàng" tab; `GET /api/invoices` with `startDate`/`endDate`/`search`; today's order count/revenue computed client-side from the fetched list (no extra request); detail modal. Replaced `ReportView` for this tab. **Tuần 5:** nút in hóa đơn không còn dùng `window.print()` — `handlePrint` gọi thẳng `downloadInvoicePdf(inv)` để tải PDF.
- `utils/invoicePdf.ts` — **mới tuần 5**, `downloadInvoicePdf(invoice: ApiInvoice)`: xuất PDF cho **hóa đơn bán hàng** (không phải đơn nhập hàng/phiếu công nợ) bằng thư viện `jspdf` (`^4.2.1`), hoàn toàn client-side, không có API backend nào. Chỉ 2 nơi gọi (`SalesManagement.tsx`, `OrderHistory.tsx`) — cả 2 đều nằm trong tab chỉ role `'Nhân viên bán hàng'` (Staff) truy cập được (`App.tsx` dòng ~590), nên Manager không dùng tính năng này qua UI. **Hạn chế đã biết:** font Helvetica mặc định của jsPDF không hỗ trợ Unicode tiếng Việt — nhãn cố định (Invoice/Customer/Product/Qty/Amount/TOTAL...) viết tiếng Anh, còn dữ liệu thật (tên khách, tên sản phẩm) bị `removeVietnameseAccents()` bỏ dấu trước khi in — đây là workaround có chủ đích, không phải bug.
- `ProductManagement.tsx` — full CRUD qua `services/product.service.ts` + `services/category.service.ts`; search server-side qua `GET /api/products/search`; form tạo/sửa map `categoryId` ↔ `categoryName` qua danh sách `categories` (props từ `App.tsx`); xóa = soft delete (`isActive=false`), label nút vẫn ghi "Xóa" trên UI dù backend chỉ vô hiệu hóa.
- `PromotionManagement.tsx` — list + create + update qua `services/promotion.service.ts`; nút "Sửa" đã được kích hoạt và wire vào `updatePromotion`; không có UI chọn sản phẩm cụ thể theo `productId` — mọi khuyến mãi tạo từ UI này đều là loại "toàn đơn hàng".
- `CustomerManagement.tsx` — list + create + update qua `services/customer.service.ts` (`searchCustomers`/`createCustomer`/`updateCustomer`); map `ApiCustomer → Customer` cục bộ trong component (`fullName→name`, `loyaltyPoints.points`, `memberLevel→tier` qua `mapTier()` fallback `'Đồng'` nếu null, `createdAt→joinDate`); filter theo tier/search vẫn chạy client-side trên data đã fetch (không gọi API lại mỗi lần đổi filter). Nút **"Sửa" đã được kích hoạt** — gọi `updateCustomer` qua `services/customer.service.ts`, reload list bằng `loadCustomers()` sau khi sửa thành công, lỗi (409 trùng phone, 404) hiển thị qua `alert`. Modal "Sửa" đã bỏ 2 input "Phân bậc xếp hạng"/"Điểm số tích lũy" vì backend không nhận field này (tier/loyaltyPoints nằm ở bảng `loyalty_points` riêng). Modal "Thêm khách hàng" đã bỏ 2 input Hạng/Điểm khởi tạo vì backend không nhận field này (luôn tạo `loyalty_points` với `points=0`). Props `customers`/`onAddCustomer` từ `App.tsx` vẫn giữ trong interface nhưng là dead prop (không gọi).
- `StockTransferManagement.tsx` — qua `services/stock-transfer.service.ts`; wired vào `App.tsx` cho cả Manager (tạo phiếu) và WarehouseStaff (xác nhận nhận hàng).
- `WarehouseManagement.tsx` — tab **Tồn kho** dùng `inventoryApi.fetchStockByStore` → `GET /api/inventory`; tab **Đơn nhập hàng** dùng `GET /api/purchase-orders`, `POST /api/purchase-orders`, `PUT /api/purchase-orders/:id/confirm`, `PUT /api/purchase-orders/:id/cancel` — tất cả qua real API. Tab "Điều chuyển hàng" (mock cũ ~400 dòng) đã bị xóa khỏi component này sau khi `StockTransferManagement.tsx` ra đời. **Tuần 5 — công nợ nhà cung cấp:** badge trạng thái mới "CÒN NỢ" (cam)/"HOÀN THÀNH" (xanh) thay cho badge "Hoàn thành" cũ; list + modal chi tiết gọi thêm `GET /api/purchase-orders/:id/payments` (Manager và WarehouseStaff đều xem được) hiển thị tổng phải trả/đã trả/còn nợ + lịch sử từng lần trả; ô nhập số tiền + nút "Ghi nhận thanh toán" (`POST .../payments`) **chỉ Manager thấy** (`isManager &&`), chỉ hiện khi còn nợ > 0.005. **Cập nhật (BranchManager confirm-order):** `ApiPurchaseOrder.status` union và `STATUS_MAP` cục bộ thêm `'ordered'`; **fix regression thật:** badge JSX trước đó chỉ có nhánh cho `pending`/`debt`/`completed`/`cancelled` — 1 đơn `'ordered'` sẽ render ô trạng thái **trống** (không khớp nhánh nào); đã thêm nhánh badge "Đã đặt hàng" (xanh dương) cho `isOrdered`. Nút "Huỷ đơn" (Manager) điều kiện hiện đổi từ chỉ `isPending` sang `isPending || isOrdered`, khớp đúng `PurchaseOrderService.cancelOrder` nay cho huỷ ở cả 2 trạng thái.
- `BranchManagerOrders.tsx` — **mới**, thay tab "Tổng quan" placeholder cũ của BranchManager; danh sách đơn nhập hàng của chi nhánh (`GET /api/purchase-orders`, không truyền `storeId` — backend tự store-scope theo token); đơn `status='pending'` hiện nút "Xác nhận đã đặt hàng" gọi `PUT /api/purchase-orders/:id/confirm-order`, các trạng thái khác chỉ hiện "Không có thao tác"; lỗi 403 (sai chi nhánh)/409 (sai trạng thái) hiện trong banner đỏ, không im lặng, kèm refetch để đồng bộ lại UI nếu dữ liệu đã lệch (vd. đơn vừa bị Manager huỷ). Không dùng `services/*.service.ts` (không có `purchase-order.service.ts`) — gọi `fetch()` trực tiếp với `API_BASE` từ `config/api.ts`, cùng kiểu với `WarehouseManagement.tsx` nhưng qua base URL chung thay vì tự đọc `VITE_API_URL` riêng.
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

15 tables: `users`, `stores`, `categories`, `products`, `inventory`, `suppliers`, `purchase_orders`, `purchase_order_details`, `purchase_order_payments`, `stock_transfers`, `customers`, `loyalty_points`, `promotions`, `invoices`, `invoice_details` — **`purchase_order_payments` thêm tuần 5, chưa có trong `Schema.md`** (vẫn liệt kê 14 bảng, xem "What Still Needs to Be Built")

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
(Không còn mục code — cả 3 mục cũ đã xong tuần 5, xem "Known issues — tuần 2" #2/#3/#8/#10.)

**Docs — cần cập nhật:**
1. `Schema.md` §7 (`purchase_orders`) chưa phản ánh commit "Thêm nợ nhà cung cấp, xuất pdf hóa đơn" lẫn commit BranchManager confirm-order sau đó: `status` ENUM thiếu cả `'debt'` và `'ordered'`, mô tả `confirmReceipt` sai (ghi update thẳng `'completed'`, không nhắc gì tới yêu cầu `status='ordered'` trước khi xác nhận), thiếu hẳn mục cho bảng `purchase_order_payments` và bước xác nhận đặt hàng của BranchManager — xem "Known issues — tuần 5" #5.
2. `Schema.md` §1 (`users`) — `role` ENUM chưa có `'BranchManager'` (lệch từ trước, không phải do commit tuần 5).

**Backend — đã xong (không còn pending):**
- ~~Hardening cho `product.controller.ts createProduct`: trả `409` khi trùng `sku` thay vì `500` chung~~ — đã xong tuần 5, kèm fix thêm bug `generateSku()` chọn nhầm SKU lớn nhất khi có dữ liệu không đúng format (Known issues — tuần 2 #2)
- ~~Bổ sung logic filter `search` cho `PurchaseOrderService.getPurchaseOrders`~~ — đã xong tuần 5, dùng `unaccent()` cùng pattern `customer.controller.ts` (Known issues — tuần 2 #8)
- ~~Chuẩn hóa `supplier.controller.ts` theo convention `return;`/`catch {}`~~ — đã xong tuần 5 (Known issues tuần 2 #10)
- ~~Category CRUD~~ — đã xong đầy đủ `POST/PUT/DELETE /api/categories`
- ~~`PromotionService.updatePromotion` + `PUT` endpoint~~ — đã xong
- ~~Loyalty Point routes~~ — đã có, đã fix mount
- ~~Server-side guard `discountAmount`~~ — đã thêm vào `OrderService.recalculateSubtotal`
- ~~Missing model `stock_transfers`~~ — đã xong model/service/controller/route/frontend
- ~~`PUT /api/customers/:id`~~ — đã xong: `updateCustomer` controller + route `PUT /api/customers/:id` với `roleMiddleware(['Staff','Manager'])`

**Backend — BranchManager & AI assistant (mới):**
1. ~~Nghiệp vụ thật cho BranchManager (schema/JWT/seed đã có, UI vẫn placeholder)~~ — **đã xong**: xác nhận đã đặt hàng với nhà cung cấp (`pending → ordered`, `PUT /api/purchase-orders/:id/confirm-order`, store-scoped đúng chi nhánh) — xem `PurchaseOrderService.confirmOrdered` và `BranchManagerOrders.tsx`. Chưa có nghiệp vụ nào khác ngoài việc này cho role.
2. `AccountManagement.tsx` chưa cho tạo tài khoản `BranchManager` qua UI (dropdown role chỉ có Staff/WarehouseStaff/Manager) — hiện chỉ tạo được qua `npm run seed`.
3. Model `gemini-flash-latest` dùng cho `ai.controller.ts` có quota free-tier giới hạn (20 request/ngày khi test) — đã có fallback tự động sang `gemini-flash-lite-latest` khi gặp lỗi 429, nhưng nếu dùng nhiều cho demo/bảo vệ đồ án nên cân nhắc nâng cấp key trả phí hoặc đổi hẳn sang model lite.
4. `Schema.md` không có mô tả trạng thái `'ordered'` (đã lệch từ trước cho `'debt'`, nay lệch thêm) — xem "Docs — cần cập nhật" bên dưới.

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
- ~~BranchManager UI placeholder~~ — đã thay bằng tab thật "Đơn nhập hàng" (`BranchManagerOrders.tsx`) — xem mục BranchManager ở đầu file và "Components connected to real API"
