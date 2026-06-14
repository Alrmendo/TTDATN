# RetailChain Backend

Backend cho hệ thống quản lý chuỗi cửa hàng — xây dựng bằng **Node.js + Express + TypeScript + Sequelize (PostgreSQL)**.

> Tham chiếu schema database đầy đủ tại [`schema.md`](../schema.md) ở root project. Mọi model phải khớp với tài liệu này.

---

## Yêu cầu môi trường

- **Node.js** >= 18
- **PostgreSQL** >= 14 (đã cài và đang chạy)
- npm

---

## Cài đặt lần đầu

### 1. Clone & cài dependencies

```bash
git clone <repo-url>
cd backend
npm install
```

### 2. Tạo database PostgreSQL

Mở `psql` hoặc pgAdmin, tạo database mới:

```sql
CREATE DATABASE retailchain;
```

### 3. Tạo file `.env`

Copy từ `.env.example`:

```bash
copy .env.example .env
```

(Mac/Linux dùng `cp .env.example .env`)

Mở `.env` và điền thông tin thật của bạn:

```
PORT=5000
DATABASE_URL=postgresql://postgres:<your_password>@localhost:5432/retailchain
JWT_SECRET=<chuỗi bí mật tùy ý, ví dụ: retailchain_secret_2026>
```

> Thay `<your_password>` bằng password PostgreSQL trên máy bạn. `JWT_SECRET` có thể đặt tùy ý nhưng **nên giống nhau giữa các thành viên** trong môi trường dev để JWT issue từ máy này verify được trên máy khác (nếu cần test chung).

### 4. Chạy server

```bash
npm run dev
```

Nếu thành công sẽ thấy:

```
✅ PostgreSQL connected successfully
✅ Database synced
🚀 Server running on port 5000
```

Sequelize sẽ **tự động tạo bảng** trong database theo các model đã định nghĩa trong `src/models/`.

---

## Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/        # Kết nối database, biến cấu hình
│   ├── controllers/    # Logic xử lý request cho từng route
│   ├── middleware/      # authMiddleware, roleMiddleware, error handler...
│   ├── models/         # Định nghĩa model Sequelize (1 file / 1 bảng)
│   ├── routes/         # Định nghĩa endpoint, map tới controller
│   └── server.ts       # Entry point — khởi tạo Express, kết nối DB
├── .env                 # Biến môi trường thật (KHÔNG push lên git)
├── .env.example         # Mẫu biến môi trường (push lên git)
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## Quy ước khi thêm code mới

### Thêm model mới

1. Tạo file `src/models/xxx.model.ts`, đặt tên bảng (`tableName`) đúng theo [`schema.md`](../schema.md) — **snake_case, số nhiều** (vd: `purchase_orders`).
2. Import model vào `src/models/index.ts`, khai báo association (quan hệ) tại đây — **không định nghĩa association rải rác ở nhiều file**.
3. Tên cột dùng `camelCase` để khớp JSON response cho frontend.

### Thêm route mới

1. Tạo controller trong `src/controllers/xxx.controller.ts`
2. Tạo route trong `src/routes/xxx.routes.ts`, áp `authMiddleware` + `roleMiddleware` nếu cần
3. Mount route vào `src/server.ts`:
   ```typescript
   import xxxRoutes from './routes/xxx.routes';
   app.use('/api/xxx', xxxRoutes);
   ```

### Method dùng chung — KHÔNG viết lại riêng

| Method | File | Dùng cho |
|---|---|---|
| `InventoryService.updateInventory(storeId, productId, quantity, mode)` | `src/services/inventory.service.ts` | Bán hàng (giảm), Nhập hàng (tăng), Điều chuyển hàng |
| `authMiddleware` | `src/middleware/auth.middleware.ts` | Tất cả route cần đăng nhập |
| `roleMiddleware(allowedRoles)` | `src/middleware/role.middleware.ts` | Tất cả route cần phân quyền theo role |

Chi tiết signature xem trong [`schema.md`](../schema.md) phần "Method signatures dùng chung".

---

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy server ở môi trường dev (auto-reload bằng nodemon) |
| `npm run build` | Compile TypeScript sang `dist/` |
| `npm start` | Chạy bản đã build (production) |

---

## Lưu ý khi pull code của người khác

Sau khi `git pull`, nếu có model mới được thêm:

```bash
npm install        # nếu có package mới
npm run dev        # Sequelize tự sync bảng mới vào DB local của bạn
```

Nếu gặp lỗi liên quan đến association/foreign key khi sync, kiểm tra lại `src/models/index.ts` xem các bảng liên quan (`storeId`, `productId`...) đã được tạo trước chưa — Sequelize cần bảng tham chiếu tồn tại trước khi tạo FK.

---

## Troubleshooting

**Lỗi `The "url" argument must be of type string. Received undefined`**
→ File `.env` chưa tồn tại hoặc `DATABASE_URL` chưa điền. Kiểm tra file `.env` ở root `backend/` (không phải trong `src/`).

**Lỗi kết nối PostgreSQL (`ECONNREFUSED`)**
→ PostgreSQL chưa chạy, hoặc sai port/user/password trong `DATABASE_URL`.

**`injected env (0) from .env`**
→ File `.env` rỗng hoặc đặt sai vị trí. Phải nằm cùng cấp với `package.json`.
