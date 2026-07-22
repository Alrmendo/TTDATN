# Hướng dẫn Deploy — TTDATN

Tài liệu này hướng dẫn deploy hệ thống TTDATN (backend Node/Express/TypeScript + PostgreSQL, frontend React/Vite) từ máy dev lên môi trường chạy thật (VPS/server). Đọc kỹ mục **"Vấn đề quan trọng cần xử lý trước khi deploy"** trước khi làm theo các bước bên dưới — nếu bỏ qua, frontend sẽ không gọi được API sau khi deploy.

---

## 0. Vấn đề quan trọng cần xử lý trước khi deploy

Phần lớn code frontend gọi API bằng URL **hardcode cứng** `http://localhost:5000/api`, không đọc từ biến môi trường:

```
frontend/src/App.tsx
frontend/src/components/AccountManagement.tsx
frontend/src/components/DashboardOverview.tsx
frontend/src/components/OrderHistory.tsx
frontend/src/components/RevenueReport.tsx
frontend/src/components/SalesManagement.tsx
frontend/src/components/StockTransferManagement.tsx
frontend/src/services/category.service.ts
frontend/src/services/customer.service.ts
frontend/src/services/inventoryApi.ts
frontend/src/services/product.service.ts
frontend/src/services/promotion.service.ts
frontend/src/services/reportApi.ts
frontend/src/services/stock-transfer.service.ts
frontend/src/services/store.service.ts
```

Chỉ riêng `WarehouseManagement.tsx` đọc `import.meta.env.VITE_API_URL` (fallback `http://localhost:5000`).

**Hệ quả:** `http://localhost:5000` chỉ đúng khi trình duyệt và backend chạy trên **cùng một máy**. Build frontend rồi host lên domain/VPS thật, trình duyệt của người dùng sẽ cố gọi `localhost:5000` của chính máy họ (không tồn tại) → toàn bộ tính năng gọi API sẽ lỗi (trừ tab Tồn kho/Đơn nhập hàng nếu bạn set `VITE_API_URL` đúng).

Chọn 1 trong 2 hướng xử lý trước khi deploy thật (không chỉ demo local):

- **Cách nhanh (khuyến nghị cho deadline gần):** Deploy backend và frontend **chung 1 domain/IP**, dùng Nginx reverse-proxy `/api` sang backend (mục 3 bên dưới), rồi tìm-thay toàn bộ `http://localhost:5000` → chuỗi rỗng `''` (để URL thành relative, ví dụ `` `${API_BASE}/stores` `` với `API_BASE = '/api'`) trong các file liệt kê ở trên.
- **Cách đúng chuẩn hơn:** Thêm 1 file `frontend/src/config/api.ts` export hằng số đọc từ `import.meta.env.VITE_API_URL`, rồi sửa từng file dùng chung hằng số đó thay vì hardcode — theo đúng pattern đã có sẵn ở `WarehouseManagement.tsx`.

Nếu chỉ demo trên **cùng một máy** (chạy backend + mở frontend trên localhost để bảo vệ đồ án), có thể bỏ qua bước sửa code này và dùng luôn `npm run dev`/`npm run preview` ở mục 1.

---

## 1. Chạy local (demo/bảo vệ đồ án — không cần sửa gì)

### Yêu cầu
- Node.js ≥ 18
- PostgreSQL đang chạy ở `localhost:5432`

### Bước 1 — Database
```bash
# Tạo database (dùng psql hoặc pgAdmin)
createdb ttdatn_db
```

### Bước 2 — Backend
```bash
cd backend
cp .env.example .env
```
Sửa `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/ttdatn_db
JWT_SECRET=<chuỗi bí mật bất kỳ, đủ dài>
```
```bash
npm install
npm run seed   # tạo dữ liệu mẫu (idempotent, chạy lại vẫn an toàn)
npm run dev    # http://localhost:5000
```
`server.ts` tự gọi `sequelize.sync({ alter: true })` khi start — bảng sẽ tự tạo/alter theo model, không cần chạy migration tay.

### Bước 3 — Frontend
```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

Đăng nhập bằng tài khoản seed: `manager@test.com` / `password123`.

---

## 2. Build production

### Backend
```bash
cd backend
npm run build     # biên dịch TypeScript → dist/
npm start         # chạy node dist/server.js
```
Cần `.env` (hoặc biến môi trường tương đương) có mặt cùng thư mục chạy — `dotenv.config()` đọc từ working directory.

### Frontend
```bash
cd frontend
npm run build      # → frontend/dist/ (static files)
npm run preview    # kiểm thử bản build tại http://localhost:4173 (tùy chọn)
```
Nếu đã set `VITE_API_URL` (mục 0), giá trị đó phải được set **tại thời điểm build** (Vite inline biến env vào bundle), ví dụ:
```bash
VITE_API_URL=https://api.yourdomain.com npm run build
```

---

## 3. Deploy lên VPS (Ubuntu, Nginx + PM2)

Kịch bản: backend chạy bằng PM2, frontend build ra static files được Nginx serve, Nginx reverse-proxy `/api` sang backend — nhờ vậy có thể dùng URL tương đối, tránh vấn đề ở mục 0.

### 3.1 Cài đặt trên VPS
```bash
sudo apt update
sudo apt install -y postgresql nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 3.2 Database
```bash
sudo -u postgres createuser ttdatn_user -P
sudo -u postgres createdb ttdatn_db -O ttdatn_user
```

### 3.3 Backend
```bash
cd /var/www/ttdatn/backend
cp .env.example .env
# sửa .env: DATABASE_URL trỏ tới DB trên, JWT_SECRET random dài, PORT=5000
npm ci
npm run build
npm run seed        # chỉ chạy lần đầu, nếu muốn có dữ liệu mẫu
pm2 start dist/server.js --name ttdatn-backend
pm2 save
pm2 startup          # tự khởi động PM2 cùng hệ thống, làm theo lệnh nó in ra
```

### 3.4 Frontend
```bash
cd /var/www/ttdatn/frontend
npm ci
npm run build         # ra thư mục dist/
```

### 3.5 Nginx
Tạo `/etc/nginx/sites-available/ttdatn`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/ttdatn/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri /index.html;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/ttdatn /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Vì đã proxy `/api` qua cùng domain, hardcode `http://localhost:5000/api` trong frontend **vẫn sẽ lỗi** khi truy cập từ máy khác — bắt buộc phải sửa các URL đó thành relative (`/api/...`) như nêu ở mục 0 trước khi build frontend cho bước này.

### 3.6 HTTPS (khuyến nghị)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 4. Biến môi trường tóm tắt

**Backend (`backend/.env`)**
| Biến | Mô tả |
|---|---|
| `PORT` | Cổng Express lắng nghe (mặc định 5000) |
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL, dạng `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret ký JWT — dùng chuỗi random dài, khác giá trị mẫu khi lên production |

**Frontend (build-time, nếu áp dụng cách sửa ở mục 0)**
| Biến | Mô tả |
|---|---|
| `VITE_API_URL` | Base URL của backend API (ví dụ `https://api.yourdomain.com` hoặc để trống nếu dùng Nginx proxy relative path) |

---

## 5. Sau khi deploy — kiểm tra nhanh

- [ ] `GET /api/auth/login` (hoặc đăng nhập từ UI) trả về token — xác nhận backend + DB kết nối được
- [ ] Mở DevTools → tab Network khi dùng frontend đã deploy, xác nhận các request `/api/...` không bắn về `localhost:5000`
- [ ] `npm run seed` chỉ chạy 1 lần cho môi trường mới — seed là idempotent nhưng không cần chạy lại mỗi lần deploy
- [ ] Đổi `JWT_SECRET` khác với giá trị trong `.env.example`
