# Schema.md — RetailChain Management System

> Tài liệu này là **nguồn tham chiếu duy nhất (single source of truth)** cho toàn bộ database schema. Mọi model trong code (Sequelize/Prisma) phải khớp chính xác với tài liệu này. Nếu phát hiện sai khác giữa Class Diagram và tài liệu này, **tài liệu này là chuẩn**.
>
> Quy ước đặt tên: tên bảng dùng `snake_case`, số nhiều (vd: `users`, `purchase_orders`). Tên cột dùng `camelCase` để khớp với JS/JSON response. Khóa chính luôn là `id` dạng UUID (string), trừ khi ghi chú khác.

---

## 1. `users`

Bảng chung cho cả 3 role: Manager, Staff, WarehouseStaff. Phân biệt qua cột `role`.

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `fullName` | string | NOT NULL | |
| `email` | string | NOT NULL, UNIQUE | dùng để đăng nhập |
| `passwordHash` | string | NOT NULL | mật khẩu đã hash (bcrypt) |
| `phone` | string | NULL | |
| `role` | ENUM('Manager', 'Staff', 'WarehouseStaff') | NOT NULL | |
| `storeId` | UUID (string) | NULL, FK → `stores.id` | NULL nếu Manager quản lý nhiều chi nhánh; bắt buộc nếu role = Staff hoặc WarehouseStaff |
| `salary` | decimal | NULL | chỉ áp dụng cho Staff, WarehouseStaff |
| `isActive` | boolean | NOT NULL, DEFAULT true | dùng cho luồng vô hiệu hóa tài khoản (SD-02) |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |
| `updatedAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- `users.storeId` → `stores.id` (N:1 — nhiều user thuộc 1 store)

**Methods (Service layer, không phải cột DB):**
- `AuthService.login(email, password): Token` — SD-01
- `AuthService.logout()`
- `UserService.createUser(data, role): User` — SD-02 (Manager dùng)
- `UserService.updateUser(userId, data): User`
- `UserService.deactivateUser(userId): void` — SD-02

> **Ghi chú quyết định:** Ban đầu CD-01 và CD-02 thiết kế khác nhau (CD-01 dùng association rời rạc cho Staff/Manager/WarehouseStaff, CD-02 dùng kế thừa từ User). Đã chốt dùng **1 bảng chung `users`** với cột `role` — đơn giản cho đăng nhập (1 query), JWT chỉ cần chứa `role` để phân quyền.

---

## 2. `stores`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `storeName` | string | NOT NULL | |
| `address` | string | NOT NULL | |
| `phone` | string | NULL | |
| `isActive` | boolean | NOT NULL, DEFAULT true | |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |
| `updatedAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- 1 store — N `users` (nhân viên thuộc chi nhánh)
- 1 store — N `inventory` (tồn kho theo chi nhánh)
- 1 store — N `purchase_orders` (đơn nhập hàng của chi nhánh)
- 1 store — N `invoices` (đơn bán hàng của chi nhánh)

**Methods (Service layer):**
- `StoreService.getInventory(storeId): List<Inventory>`
- `StoreService.addEmployee(storeId, employeeId): void`

---

## 3. `categories`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `categoryName` | string | NOT NULL | |
| `description` | string | NULL | |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |
| `updatedAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- 1 category — N `products`

> **Ghi chú quyết định:** Bỏ `parentCategoryId` (category cha-con) xuất hiện trong CD-01 — không có trong Requirements/Vision Document, không cần cho tuần 1. Có thể bổ sung sau nếu cần.

---

## 4. `products`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `productName` | string | NOT NULL | |
| `sku` | string | NOT NULL, UNIQUE | mã sản phẩm — dùng để tìm kiếm (FR_3) |
| `categoryId` | UUID (string) | NOT NULL, FK → `categories.id` | |
| `description` | string | NULL | |
| `price` | decimal | NOT NULL | giá bán |
| `costPrice` | decimal | NULL | giá nhập — dùng cho báo cáo tồn kho (SD-06) |
| `isActive` | boolean | NOT NULL, DEFAULT true | "Đang kinh doanh" / "Ngừng kinh doanh" |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |
| `updatedAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- N products — 1 category (`categoryId`)
- 1 product — N `inventory` (tồn kho khác nhau theo từng chi nhánh)
- 1 product — N `purchase_order_details`
- 1 product — N `invoice_details`
- 1 product — N `promotions` (nullable — khuyến mãi theo sản phẩm cụ thể)

**Methods (Service layer):**
- `ProductService.createProduct(data): Product` — SD-03
- `ProductService.updateProduct(productId, data): Product`
- `ProductService.deleteProduct(productId): void` — chỉ cho phép nếu không tồn tại trong `invoice_details`
- `ProductService.searchProducts(query): List<Product>`
- `ProductService.checkProductInOrders(productId): boolean` — dùng trước khi xóa (SD-03 bước 16)

> **Ghi chú quyết định:** **KHÔNG** có cột `quantity` trên `products` — tồn kho luôn quản lý qua bảng `inventory` (theo storeId). Quan hệ `Product → Category` (Product có `categoryId`) — đã sửa hướng ngược trong CD-01 cho đúng.

---

## 5. `inventory`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `storeId` | UUID (string) | NOT NULL, FK → `stores.id` | |
| `productId` | UUID (string) | NOT NULL, FK → `products.id` | |
| `quantity` | integer | NOT NULL, DEFAULT 0 | |
| `lowStockThreshold` | integer | NOT NULL, DEFAULT 10 | ngưỡng cảnh báo "Sắp hết" (UI prompt 7) |
| `lastUpdated` | datetime | NOT NULL, DEFAULT now() | |

**Ràng buộc:** UNIQUE (`storeId`, `productId`) — mỗi sản phẩm chỉ có 1 bản ghi tồn kho / 1 chi nhánh.

**Quan hệ:**
- N inventory — 1 store (`storeId`)
- N inventory — 1 product (`productId`)

**Methods — chốt rõ 2 layer (Ghi chú quyết định #2):**

- **Service layer — `InventoryService.updateInventory(storeId, productId, quantity, mode)`**
  - Tìm bản ghi `inventory` theo `(storeId, productId)`. Nếu chưa có thì tạo mới với `quantity = 0` trước.
  - `mode`: `'increase'` (nhập hàng, điều chuyển đến) hoặc `'decrease'` (bán hàng, điều chuyển đi)
  - Gọi `Inventory.adjustQuantity(delta)` của bản ghi tìm được, với `delta = +quantity` hoặc `-quantity` tùy `mode`
  - **Đây là function DÙNG CHUNG** — SD-04 (bán hàng, mode='decrease') và SD-05 (nhập hàng, mode='increase') đều phải gọi qua service này, KHÔNG viết riêng từng module.

- **Model layer — `Inventory.adjustQuantity(delta)`**
  - `this.quantity += delta; this.lastUpdated = now(); save()`
  - Nếu kết quả < 0 → throw lỗi "Tồn kho không đủ" (dùng trong alt flow của SD-04 bước 9a)

- `InventoryService.checkLowStock(storeId): List<Inventory>` — trả về các bản ghi có `quantity < lowStockThreshold`
- `InventoryService.getStockByStore(storeId): List<Inventory>`

> **Ghi chú quyết định:** Đây là điểm rủi ro lớn nhất đã phát hiện qua review (SD-04 gọi `updateInventory(storeId,productId,qty)` + `adjustQuantity(-qty)`, SD-05 gọi `updateInventory(productId,quantity)`, CD-04 định nghĩa `updateInventory(quantity)` — 3 signature khác nhau). **Từ giờ chỉ dùng đúng 2 method ở trên**, không tạo thêm biến thể khác.

---

## 6. `suppliers`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `supplierName` | string | NOT NULL | |
| `contactInfo` | string | NULL | |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- 1 supplier — N `purchase_orders`

> Supplier là **actor ngoài hệ thống** (không có tài khoản đăng nhập) — bảng này chỉ lưu thông tin liên hệ.

---

## 7. `purchase_orders`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `supplierId` | UUID (string) | NOT NULL, FK → `suppliers.id` | |
| `storeId` | UUID (string) | NOT NULL, FK → `stores.id` | chi nhánh nhận hàng |
| `status` | ENUM('pending', 'completed', 'cancelled') | NOT NULL, DEFAULT 'pending' | |
| `totalCost` | decimal | NOT NULL, DEFAULT 0 | tính từ tổng `purchase_order_details` |
| `createdBy` | UUID (string) | NOT NULL, FK → `users.id` | Manager tạo đơn |
| `confirmedBy` | UUID (string) | NULL, FK → `users.id` | WarehouseStaff xác nhận (SD-05) |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |
| `confirmedAt` | datetime | NULL | |

**Quan hệ:**
- N purchase_orders — 1 supplier (`supplierId`)
- N purchase_orders — 1 store (`storeId`)
- 1 purchase_order — N `purchase_order_details` (composition)

**Methods (Service layer):**
- `PurchaseOrderService.createPurchaseOrder(data): PurchaseOrder` — SD-05, Manager
- `PurchaseOrderService.getPurchaseOrder(orderId): PurchaseOrder`
- `PurchaseOrderService.confirmReceipt(orderId, receivedItems)`:
  1. update `purchase_orders.status = 'completed'`, `confirmedBy`, `confirmedAt`
  2. với mỗi item trong `receivedItems` → gọi `InventoryService.updateInventory(storeId, productId, receivedQty, 'increase')`
  - SD-05 cho phép số lượng thực nhận khác đơn (alt flow bước 17) — `receivedItems` dùng số lượng thực tế, không phải số lượng trong `purchase_order_details`
- `PurchaseOrderService.cancelOrder(orderId): void`
- `PurchaseOrder.calculateTotalCost(): decimal` — tổng `quantity * unitCost` của tất cả `purchase_order_details`

---

## 8. `purchase_order_details`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `purchaseOrderId` | UUID (string) | NOT NULL, FK → `purchase_orders.id` | |
| `productId` | UUID (string) | NOT NULL, FK → `products.id` | |
| `quantity` | integer | NOT NULL | số lượng đặt (theo đơn) |
| `receivedQuantity` | integer | NULL | số lượng thực nhận — NULL nếu chưa xác nhận, set khi confirmReceipt (SD-05 alt flow) |
| `unitCost` | decimal | NOT NULL | |

**Quan hệ:**
- N purchase_order_details — 1 purchase_order (composition — xóa order thì xóa details)
- N purchase_order_details — 1 product (`productId`)

**Methods:**
- `PurchaseOrderDetail.getSubtotal(): decimal` — `quantity * unitCost`

---

## 9. `stock_transfers`

> Bảng mới — bổ sung cho use-case "Điều chuyển hàng giữa chi nhánh" (UC-02), chưa có trong Class Diagram gốc nào nhưng cần thiết để hiện thực hóa luồng đã thống nhất ở UC-02.

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `fromStoreId` | UUID (string) | NOT NULL, FK → `stores.id` | |
| `toStoreId` | UUID (string) | NOT NULL, FK → `stores.id` | |
| `productId` | UUID (string) | NOT NULL, FK → `products.id` | |
| `quantity` | integer | NOT NULL | |
| `status` | ENUM('pending', 'completed') | NOT NULL, DEFAULT 'pending' | |
| `createdBy` | UUID (string) | NOT NULL, FK → `users.id` | Manager khởi tạo |
| `confirmedBy` | UUID (string) | NULL, FK → `users.id` | WarehouseStaff ở `toStoreId` xác nhận |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |
| `confirmedAt` | datetime | NULL | |

**Methods (Service layer):**
- `StockTransferService.createTransfer(data): StockTransfer` — Manager
- `StockTransferService.confirmTransfer(transferId)`:
  1. update `status = 'completed'`, `confirmedBy`, `confirmedAt`
  2. gọi `InventoryService.updateInventory(fromStoreId, productId, quantity, 'decrease')`
  3. gọi `InventoryService.updateInventory(toStoreId, productId, quantity, 'increase')`

> **Lưu ý:** Bảng này là **bổ sung mới** để khớp với UC-02 (đã thống nhất: Manager khởi tạo → WarehouseStaff chi nhánh nhận xác nhận → cập nhật Inventory 2 chiều). Method `confirmTransfer` cũng dùng chung `InventoryService.updateInventory()`.

---

## 10. `customers`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `fullName` | string | NOT NULL | |
| `phone` | string | NOT NULL, UNIQUE | dùng để tìm kiếm khi bán hàng (SD-04) |
| `email` | string | NULL | |
| `address` | string | NULL | |
| `memberLevel` | string | NULL | vd: "Bronze", "Silver", "Gold" — dựa theo `loyalty_points` |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- 1 customer — N `invoices`
- 1 customer — 1 `loyalty_points`

**Methods (Service layer):**
- `CustomerService.createCustomer(data): Customer`
- `CustomerService.updateCustomer(customerId, data): Customer`
- `CustomerService.searchCustomers(query): List<Customer>` — theo tên hoặc SĐT (FR_5)

---

## 11. `loyalty_points`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `customerId` | UUID (string) | NOT NULL, UNIQUE, FK → `customers.id` | 1-1 với customer |
| `points` | integer | NOT NULL, DEFAULT 0 | |
| `updatedAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- 1-1 với `customers`

**Methods (Service layer):**
- `LoyaltyPointService.addPoints(customerId, amount): void` — SD-04 bước 32, gọi sau khi thanh toán thành công
- `LoyaltyPointService.redeemPoints(customerId, amount): boolean`
- `LoyaltyPointService.getBalance(customerId): integer`

> **Ghi chú:** Bỏ `expiresAt` (điểm hết hạn) xuất hiện trong CD-01 — không có trong Requirements/Vision Document, không cần cho tuần 1.

---

## 12. `promotions`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `name` | string | NOT NULL | |
| `type` | ENUM('percentage', 'fixed') | NOT NULL | "Giảm %" hoặc "Giảm trực tiếp" |
| `value` | decimal | NOT NULL | giá trị giảm (% hoặc số tiền tùy `type`) |
| `productId` | UUID (string) | NULL, FK → `products.id` | **NULL = áp dụng toàn đơn hàng** (dùng `minOrderValue`). **Có giá trị = chỉ áp dụng cho sản phẩm này** |
| `minOrderValue` | decimal | NULL | chỉ có ý nghĩa khi `productId` IS NULL |
| `startDate` | datetime | NOT NULL | |
| `endDate` | datetime | NOT NULL | |
| `isActive` | boolean | NOT NULL, DEFAULT true | |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |

**Logic áp dụng (Ghi chú quyết định #6):**
- Nếu `productId` IS NULL → khuyến mãi áp dụng lên `totalAmount` của `invoice`, chỉ hợp lệ nếu `totalAmount >= minOrderValue`
- Nếu `productId` IS NOT NULL → khuyến mãi chỉ giảm giá trên dòng `invoice_details` có `productId` tương ứng, không quan tâm `minOrderValue`

**Methods (Service layer):**
- `PromotionService.createPromotion(data): Promotion`
- `PromotionService.updatePromotion(promotionId, data): Promotion`
- `PromotionService.deactivatePromotion(promotionId): void` — không cho xóa nếu đang active & chưa hết hạn (theo Requirements 3.6 alt flow 5), chỉ vô hiệu hóa
- `Promotion.isValid(orderValue): boolean` — check `isActive`, `startDate <= now <= endDate`, và `orderValue >= minOrderValue` (nếu áp dụng toàn đơn)
- `Promotion.calculateDiscount(amount): decimal` — `amount * value / 100` nếu `type='percentage'`, hoặc `value` nếu `type='fixed'`

> **Ghi chú quyết định:** Đổi tên `Promotion.applyPromotion()` (trùng tên với `Invoice.applyPromotion()` trong CD-03) thành `Promotion.calculateDiscount()` để tránh nhầm lẫn khi code.

---

## 13. `invoices`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `storeId` | UUID (string) | NOT NULL, FK → `stores.id` | |
| `staffId` | UUID (string) | NOT NULL, FK → `users.id` | nhân viên tạo đơn |
| `customerId` | UUID (string) | NULL, FK → `customers.id` | NULL = khách vãng lai |
| `promotionId` | UUID (string) | NULL, FK → `promotions.id` | khuyến mãi áp dụng (nếu có) |
| `status` | ENUM('draft', 'completed', 'cancelled') | NOT NULL, DEFAULT 'draft' | theo SD-04 (status: DRAFT → COMPLETED) |
| `subtotal` | decimal | NOT NULL, DEFAULT 0 | tổng trước giảm giá |
| `discountAmount` | decimal | NOT NULL, DEFAULT 0 | |
| `totalAmount` | decimal | NOT NULL, DEFAULT 0 | `subtotal - discountAmount` |
| `paymentMethod` | string | NULL | "cash", "card", "transfer"... — set khi thanh toán |
| `paymentStatus` | ENUM('pending', 'success', 'failed') | NOT NULL, DEFAULT 'pending' | |
| `paidAt` | datetime | NULL | |
| `createdAt` | datetime | NOT NULL, DEFAULT now() | |

**Quan hệ:**
- N invoices — 1 store
- N invoices — 1 user (staff, `staffId`)
- N invoices — 1 customer (`customerId`, nullable)
- N invoices — 0..1 promotion (`promotionId`, nullable)
- 1 invoice — N `invoice_details` (composition)

**Methods (Service layer) — theo đúng thứ tự SD-04:**
- `OrderService.createOrder(storeId, staffId): Invoice` — bước 2-4, tạo với `status='draft'`
- `OrderService.addItem(invoiceId, productId, qty)`:
  1. gọi `InventoryService.checkStock(storeId, productId, qty)` — nếu `quantity < qty` → throw lỗi "Tồn kho không đủ" (alt flow 9a)
  2. insert vào `invoice_details`
- `OrderService.applyPromotion(invoiceId, promoCode)`:
  1. gọi `Promotion.isValid(orderTotal)`
  2. nếu hợp lệ → gọi `Promotion.calculateDiscount()` → update `discountAmount`
  3. nếu không hợp lệ → `discountAmount = 0`, lý do "Không áp dụng được"
- `Invoice.calculateTotal(): decimal` — `subtotal - discountAmount`
- `OrderService.confirmPayment(invoiceId, method, amount)`:
  1. update `paymentMethod`, `paymentStatus='success'`, `paidAt`, `status='completed'`
  2. gọi `InventoryService.updateInventory(storeId, productId, qty, 'decrease')` cho từng `invoice_details`
  3. nếu `customerId` không NULL → gọi `LoyaltyPointService.addPoints(customerId, earnedPoints)`
- `Invoice.printInvoice(): InvoiceData` — bước 30-31, lấy dữ liệu để in hóa đơn

> **Ghi chú quyết định:** Đã chốt dùng tên `Invoice`/`InvoiceDetail` (không dùng `Order`/`OrderDetail` như CD-01) — tên service layer vẫn có thể giữ `OrderService` (vì SD-04 đã dùng tên này nhiều) nhưng **model/bảng là `Invoice`/`invoices`**. Đã gộp `Payment` vào `invoices` (không tách bảng riêng) — các cột `paymentMethod`, `paymentStatus`, `paidAt` nằm trong `invoices`.

---

## 14. `invoice_details`

| Cột | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `id` | UUID (string) | PK | |
| `invoiceId` | UUID (string) | NOT NULL, FK → `invoices.id` | |
| `productId` | UUID (string) | NOT NULL, FK → `products.id` | |
| `quantity` | integer | NOT NULL | |
| `unitPrice` | decimal | NOT NULL | giá tại thời điểm bán (snapshot, không lấy giá hiện tại của product) |
| `subtotal` | decimal | NOT NULL | `quantity * unitPrice` |

**Quan hệ:**
- N invoice_details — 1 invoice (composition)
- N invoice_details — 1 product (`productId`)

**Methods:**
- `InvoiceDetail.calculateSubtotal(): decimal` — `quantity * unitPrice`

---

## Tổng quan quan hệ giữa các bảng (ER summary)

```
users ──N:1── stores
products ──N:1── categories
inventory ──N:1── stores
inventory ──N:1── products       (UNIQUE storeId+productId)

purchase_orders ──N:1── suppliers
purchase_orders ──N:1── stores
purchase_orders ──1:N── purchase_order_details
purchase_order_details ──N:1── products

stock_transfers ──N:1── stores (fromStoreId, toStoreId)
stock_transfers ──N:1── products

customers ──1:1── loyalty_points
promotions ──N:1── products (nullable)

invoices ──N:1── stores
invoices ──N:1── users (staffId)
invoices ──N:1── customers (nullable)
invoices ──N:1── promotions (nullable)
invoices ──1:N── invoice_details
invoice_details ──N:1── products
```

---

## Danh sách bảng (tổng hợp 14 bảng)

| # | Bảng | Module phụ trách |
|---|---|---|
| 1 | `users` | Người 1 (Auth & Account) |
| 2 | `stores` | Chung — setup ngày 15/6 |
| 3 | `categories` | Người 2 (Sản phẩm & Khuyến mãi) |
| 4 | `products` | Người 2 |
| 5 | `inventory` | Người 3 (Tồn kho & Báo cáo) |
| 6 | `suppliers` | Người 2 (Nhập hàng) |
| 7 | `purchase_orders` | Người 2 |
| 8 | `purchase_order_details` | Người 2 |
| 9 | `stock_transfers` | Người 1 hoặc Người 2 (UC-02 — cần phân công thêm) |
| 10 | `customers` | Người 1 (Bán hàng) |
| 11 | `loyalty_points` | Người 1 |
| 12 | `promotions` | Người 2 |
| 13 | `invoices` | Người 1 |
| 14 | `invoice_details` | Người 1 |

---

## Các điểm đã lược bớt so với Class Diagram gốc (cho tuần 1)

1. **`RevokedToken`/`SessionMgr`** (SD-02 force-logout) — chưa làm, tuần 1 dùng JWT thuần (stateless), bỏ qua force-logout khi vô hiệu hóa tài khoản.
2. **`categories.parentCategoryId`** (category cha-con) — chưa cần.
3. **`loyalty_points.expiresAt`** (điểm hết hạn) — chưa cần.
4. **`WarehouseStaff` methods mở rộng** (`createStockCheck()`, `reportDamagedGoods()`, `transferStock()` của CD-01) — tuần 1 chỉ làm các method cơ bản đã thống nhất: `confirmReceipt()`, `checkInventory()`, `updateInventory()` (qua InventoryService), `transferInventory()` (qua `stock_transfers`).

---

## Method signatures dùng chung — BẮT BUỘC tuân theo

| Method | Vị trí | Dùng bởi | Mục đích |
|---|---|---|---|
| `InventoryService.updateInventory(storeId, productId, quantity, mode)` | Service | SD-04 (Người 1), SD-05 (Người 2), stock_transfers (UC-02) | Cập nhật tồn kho — KHÔNG viết lại riêng |
| `Inventory.adjustQuantity(delta)` | Model | gọi từ `updateInventory()` | Cộng/trừ trực tiếp số lượng |
| `authMiddleware` | Middleware | TẤT CẢ route cần đăng nhập | Verify JWT, gán `req.user` |
| `roleMiddleware(allowedRoles)` | Middleware | TẤT CẢ route cần phân quyền | Check `req.user.role` |