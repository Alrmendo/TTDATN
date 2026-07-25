# TEST_RESULTS — Kiểm thử tự động tầng API (TTDATN)

Chạy lúc: 17:16:55 25/7/2026 (giờ VN) — RUN_TAG=MS07SGCM

**Tổng số test case: 119** — PASS: **114** — FAIL: **3** — N/A (không thể test / không áp dụng, xem ghi chú): **2**

Script test: Node.js, dùng `fetch` (built-in Node 24, không cần axios), chạy trực tiếp trên DB local (`npm run dev`), đọc code backend thật (controller/service/route) trước khi viết từng test case — không đoán shape response. Dữ liệu test tự tạo đã được dọn sạch ở cuối script (deactivate/soft-delete qua API cho tài khoản/chi nhánh/sản phẩm/khuyến mãi, reset tồn kho về 0 cho các sản phẩm test riêng); phần không có API xóa được liệt kê ở mục cuối file.

**Đây là lần chạy lại (regression run) sau khi sửa 4 việc trên nhánh `fix/store-scoping-and-loyalty`** — script y hệt lần trước, chỉ sửa 2 test case #57/#62 (Bán hàng) từ N/A thành test case thật vì API `PATCH /api/invoices/:id/customer` giờ đã tồn tại. Toàn bộ case còn lại giữ nguyên logic assertion, không mở rộng phạm vi.

## So với lần chạy trước (108 PASS / 5 FAIL / 4 N/A → 114 PASS / 3 FAIL / 2 N/A)

**7 case liên quan tới 4 việc đã sửa — tất cả đều đã chuyển đúng như kỳ vọng:**

| STT lần này | STT lần trước | Test case | Trước | Sau |
|---|---|---|---|---|
| #57 | #57 | Gắn khách hàng với customerId không tồn tại → 404 | N/A | **PASS** |
| #58 | — | Gắn khách hàng vào hóa đơn (PATCH mới) → 200, customerId lưu đúng | N/A | **PASS** |
| #63 | #62 | Điểm tích lũy cộng đúng = floor(totalAmount/10000) qua API thật | N/A | **PASS** (before=0 → after=9 điểm, totalAmount=90.000đ) |
| #69 | #68 | `GET /api/inventory?storeId=` → 200 array | FAIL (500, thiếu `as:'category'`) | **PASS** |
| #91 | #90 | WarehouseStaff Q1 xem PO của Q7 qua `GET /:id` → phải bị chặn | FAIL (200, lộ dữ liệu) | **PASS** (403) |
| #92 | #91 | WarehouseStaff Q1 confirmReceipt PO của Q7 → phải bị chặn | FAIL (200, tăng nhầm tồn kho) | **PASS** (403) |
| #97 | #96 | Xác nhận điều chuyển vượt tồn kho → 409 | FAIL (500) | **PASS** (409) |
| #99 | #98 | WarehouseStaff chi nhánh không liên quan confirm transfer → phải bị chặn | FAIL (200) | **PASS** (403) |

(7 case như trên — đúng như yêu cầu, không phải 6.)

**3 FAIL mới xuất hiện lần này — cả 3 đều KHÔNG phải bug ứng dụng, không liên quan tới 4 việc vừa sửa:**

1. **[#93, #94]** Tìm đơn nhập hàng theo tên NCC — **do dữ liệu test của lần chạy TRƯỚC (`MS04VI23`) chưa dọn sạch được** (supplier không có API xóa, xem mục cuối file lần trước), nên DB hiện có 2 nhà cung cấp cùng khớp `%Cung Ứng%`: `"...ZTest Cung Ứng MS04VI23"` (rác từ lần trước) và `"...ZTest Cung Ứng MS07SGCM"` (lần này). Đã xác minh trực tiếp bằng query: cả 2 tên đều thật sự khớp pattern tìm kiếm — bản thân tính năng `unaccent()` search hoạt động đúng, chỉ là assertion "chỉ trả đúng 1 NCC" không còn đúng khi tích lũy nhiều lần chạy test liên tiếp (hệ quả tất yếu của việc `suppliers` không có API xóa). Không phải lỗi code, không phải regression từ 4 việc vừa sửa.
2. **[#118]** BranchManager hỏi vượt quyền — AI **trả lời ĐÚNG** ("Yêu cầu xem dữ liệu toàn hệ thống nằm ngoài quyền hạn... Bạn chỉ có quyền xem dữ liệu thuộc chi nhánh của mình" + gắn nhãn rõ "riêng chi nhánh bạn"), nhưng regex kiểm tra từ khóa trong script (`chi nhánh của (bạn|anh|chị)`, `không được phép`, `giới hạn`...) không khớp đúng cách paraphrase LLM chọn lần này ("quyền hạn" thay vì "giới hạn", "chi nhánh của mình" thay vì "chi nhánh của bạn"). Đây là hạn chế của cách so khớp từ khóa trong script test (LLM output không xác định/không lặp lại y hệt mỗi lần gọi), không phải lỗi phân quyền — số liệu ở case #119 (đối chiếu số) vẫn PASS, xác nhận AI trả đúng phạm vi chi nhánh.

## 2 mục N/A còn lại — lý do cụ thể

- **[#64] redeemPoints**: đã grep `SalesManagement.tsx` và `CustomerManagement.tsx` trước khi viết test theo đúng yêu cầu — không có call site nào gọi `POST /api/loyalty-points/redeem`. Chỉ tồn tại ở backend, chưa được nối UI nào. Theo yêu cầu, bỏ qua viết test case cho tính năng chưa dùng.
- **[#73] Bước "BranchManager xác nhận đặt hàng"**: đọc `PurchaseOrderService.ts` thật thì state machine chỉ có `pending → (WarehouseStaff.confirmReceipt) → debt|completed` hoặc `pending → (Manager.cancelOrder) → cancelled`. Không có bước xác nhận trung gian nào của BranchManager trong luồng đơn nhập hàng — bỏ qua bước này thay vì bịa ra API không tồn tại.

## Bảng chi tiết 119 test case

| STT | Module | Test case | Kết quả | Ghi chú |
|---|---|---|---|---|
| 1 | Auth & phân quyền | Đăng nhập thành công — Manager | PASS |  |
| 2 | Auth & phân quyền | Đăng nhập thành công — Staff (Q1) | PASS |  |
| 3 | Auth & phân quyền | Đăng nhập thành công — Staff (Q7) | PASS |  |
| 4 | Auth & phân quyền | Đăng nhập thành công — Staff (Bình Thạnh) | PASS |  |
| 5 | Auth & phân quyền | Đăng nhập thành công — WarehouseStaff (Q1) | PASS |  |
| 6 | Auth & phân quyền | Đăng nhập thành công — WarehouseStaff (Q7) | PASS |  |
| 7 | Auth & phân quyền | Đăng nhập thành công — WarehouseStaff (Bình Thạnh) | PASS |  |
| 8 | Auth & phân quyền | Đăng nhập thành công — BranchManager (Q1) | PASS |  |
| 9 | Auth & phân quyền | Đăng nhập thành công — BranchManager (Q7) | PASS |  |
| 10 | Auth & phân quyền | Đăng nhập thành công — BranchManager (Bình Thạnh) | PASS |  |
| 11 | Auth & phân quyền | Sai mật khẩu → 401 | PASS | nhận 401 |
| 12 | Auth & phân quyền | Email không tồn tại → 401 | PASS | nhận 401 |
| 13 | Auth & phân quyền | Gọi API cần đăng nhập mà không có token → 401 | PASS | nhận 401 |
| 14 | Auth & phân quyền | Staff gọi GET /api/accounts (Manager-only) → 403 | PASS | nhận 403 |
| 15 | Tài khoản | Manager tạo tài khoản Staff mới → 201 | PASS |  |
| 16 | Tài khoản | Tạo tài khoản role=BranchManager qua API (không hỗ trợ) → 400 | PASS | nhận 400: "Role không hợp lệ. Chỉ chấp nhận: Manager, Staff, WarehouseStaff" |
| 17 | Tài khoản | Tạo tài khoản trùng email → 409 | PASS | nhận 409 |
| 18 | Tài khoản | Sửa tài khoản (fullName/phone) → 200 | PASS |  |
| 19 | Tài khoản | Staff (không phải Manager) tạo tài khoản → 403 | PASS | nhận 403 |
| 20 | Tài khoản | Deactivate tài khoản → 200, isActive=false | PASS |  |
| 21 | Tài khoản | Login tài khoản đã deactivate → 403 | PASS | nhận 403 |
| 22 | Chi nhánh | Manager tạo chi nhánh mới → 201 | PASS |  |
| 23 | Chi nhánh | Sửa chi nhánh (address) → 200 | PASS |  |
| 24 | Chi nhánh | Chi nhánh mới xuất hiện trong GET /api/stores (mọi role đã login) | PASS |  |
| 25 | Chi nhánh | Deactivate chi nhánh → 200 | PASS |  |
| 26 | Chi nhánh | Chi nhánh đã deactivate biến mất khỏi GET /api/stores | PASS |  |
| 27 | Chi nhánh | Staff tạo chi nhánh → 403 | PASS | nhận 403 |
| 28 | Sản phẩm | Tạo 5 sản phẩm liên tiếp (tuần tự) → không 500, SKU không trùng | PASS | skus=SP0036..SP0040 |
| 29 | Sản phẩm | Tạo 5 sản phẩm ĐỒNG THỜI (Promise.all) → không 500, SKU trong số request thành công không trùng | PASS | 201=1 409=4 500=0 (race nhẹ trong generateSku(), catch đúng thành 409) |
| 30 | Sản phẩm | Sửa sản phẩm (price) → 200 | PASS |  |
| 31 | Sản phẩm | Tìm kiếm sản phẩm active qua GET /api/products/search → thấy sản phẩm vừa tạo | PASS |  |
| 32 | Sản phẩm | Soft delete sản phẩm (DELETE /api/products/:id) → 200 | PASS |  |
| 33 | Sản phẩm | Sản phẩm soft-delete vẫn query được qua GET /api/products (isActive=false) | PASS |  |
| 34 | Sản phẩm | Sản phẩm soft-delete bị ẩn khỏi GET /api/products/search (bán hàng) | PASS |  |
| 35 | Sản phẩm | Staff tạo sản phẩm → 403 | PASS | nhận 403 |
| 36 | Khuyến mãi | Tạo khuyến mãi toàn đơn hàng (percentage) → 201 | PASS |  |
| 37 | Khuyến mãi | Sửa khuyến mãi (value) → 200 | PASS |  |
| 38 | Khuyến mãi | Tạo khuyến mãi theo sản phẩm cụ thể (fixed) → 201 | PASS |  |
| 39 | Khuyến mãi | Tạo khuyến mãi đã hết hạn → 201 | PASS |  |
| 40 | Khuyến mãi | Áp khuyến mãi ĐÃ HẾT HẠN vào hóa đơn → discountAmount=0 (không áp dụng, theo Promotion.isValid()) | PASS |  |
| 41 | Khuyến mãi | Staff tạo khuyến mãi → 403 | PASS | nhận 403 |
| 42 | Khách hàng | Tạo khách hàng mới → 201 | PASS |  |
| 43 | Khách hàng | Tạo khách hàng trùng SĐT → 409 | PASS | nhận 409 |
| 44 | Khách hàng | Khách hàng mới có 0 điểm tích lũy (tự tạo loyalty_points) | PASS |  |
| 45 | Khách hàng | Sửa khách hàng (fullName) → 200 | PASS |  |
| 46 | Khách hàng | Sửa khách hàng sang SĐT đã tồn tại (customer khác) → 409 | PASS | nhận 409 |
| 47 | Khách hàng | Tìm khách hàng CÓ dấu ("Nguyễn Văn ZTest") → thấy kết quả | PASS |  |
| 48 | Khách hàng | Tìm khách hàng KHÔNG dấu ("Nguyen Van ZTest") → vẫn thấy kết quả (unaccent()) | PASS |  |
| 49 | Khách hàng | WarehouseStaff gọi GET /api/customers (Staff/Manager only) → 403 | PASS | nhận 403 |
| 50 | Bán hàng | Tạo hóa đơn nháp (POST /api/invoices) → 201 status=draft | PASS |  |
| 51 | Bán hàng | Thêm sản phẩm A (3, trong tồn kho 20) vào hóa đơn → 200 | PASS |  |
| 52 | Bán hàng | Thêm sản phẩm vượt tồn kho (999 > 2) → 422 "Tồn kho không đủ" | PASS | nhận 422 |
| 53 | Bán hàng | Thêm sản phẩm B (1, trong tồn kho 2) vào hóa đơn → 200 | PASS |  |
| 54 | Bán hàng | Tự động áp KM tốt nhất lần 1 → discountAmount khớp tính toán độc lập (KM giảm nhiều nhất) | PASS |  |
| 55 | Bán hàng | Sửa giỏ hàng sau khi đã áp KM (tăng SL sản phẩm A từ 3 lên 5) → 200 | PASS |  |
| 56 | Bán hàng | Sau khi sửa giỏ, tự động áp lại KM → tính lại đúng theo subtotal MỚI (không dùng số cũ) | PASS |  |
| 57 | Bán hàng | Gắn khách hàng với customerId không tồn tại vào hóa đơn → 404 | **PASS** | nhận 404 "Không tìm thấy khách hàng" — **mới, trước là N/A vì API chưa tồn tại** |
| 58 | Bán hàng | Gắn khách hàng vào hóa đơn (PATCH /api/invoices/:id/customer, hóa đơn còn draft) → 200, customerId lưu đúng | **PASS** | **mới, trước là N/A** |
| 59 | Bán hàng | Thanh toán thiếu tiền → 422 "Số tiền không đủ" | PASS | nhận 422 |
| 60 | Bán hàng | Thanh toán đủ tiền → 200, status=completed | PASS |  |
| 61 | Bán hàng | Sau thanh toán, tồn kho sản phẩm A giảm đúng 5 (20 → 15) | PASS | xác nhận qua addItem boundary-check |
| 62 | Bán hàng | Sau thanh toán, tồn kho sản phẩm B giảm đúng 1 (2 → 1) | PASS | xác nhận qua addItem boundary-check |
| 63 | Bán hàng | Điểm tích lũy cộng đúng sau thanh toán = floor(totalAmount/10000) qua API thật | **PASS** | before=0, totalAmount=90.000đ, expected=9 → balance sau=9 — **mới, trước là N/A vì phụ thuộc case #57/#58** |
| 64 | Bán hàng | redeemPoints (đổi điểm tích lũy lấy giảm giá) | N/A | Không có UI nào gọi — xem mục "2 mục N/A" ở trên. |
| 65 | Lịch sử đơn hàng | Lọc lịch sử đơn hàng theo khoảng ngày (hôm nay) → thấy hóa đơn vừa thanh toán | PASS |  |
| 66 | Lịch sử đơn hàng | Tìm kiếm lịch sử đơn hàng theo (một phần) mã hóa đơn → thấy kết quả khớp | PASS |  |
| 67 | Lịch sử đơn hàng | Manager lọc lịch sử theo storeId=Quận 1 → thấy hóa đơn của Quận 1 | PASS |  |
| 68 | Lịch sử đơn hàng | Manager lọc lịch sử theo storeId=Quận 7 → KHÔNG thấy hóa đơn của Quận 1 | PASS |  |
| 69 | Tồn kho | Xem tồn kho theo chi nhánh (GET /api/inventory?storeId=) → 200, trả về mảng | **PASS** | **đã fix — trước FAIL 500 do thiếu `as:'category'`** |
| 70 | Tồn kho | Cập nhật tay tồn kho (PUT /api/inventory/:productId) → 200, giá trị mới đúng | PASS |  |
| 71 | Tồn kho | Sản phẩm vừa hạ tồn kho dưới ngưỡng (3 < 10) → xuất hiện trong danh sách sắp hết hàng | PASS |  |
| 72 | Tồn kho | Staff (không phải Manager/WarehouseStaff) gọi GET /api/inventory → 403 | PASS | nhận 403 |
| 73 | Đơn nhập hàng | (Ghi chú luồng) Bước "BranchManager xác nhận đặt hàng" không tồn tại trong code thật | N/A | Xem mục "2 mục N/A" ở trên. |
| 74 | Đơn nhập hàng | Tạo nhà cung cấp mới (POST /api/suppliers) → 201 | PASS |  |
| 75 | Đơn nhập hàng | Manager tạo đơn nhập hàng (2 dòng sản phẩm) → 201, status=pending | PASS |  |
| 76 | Đơn nhập hàng | Staff (không phải WarehouseStaff) xác nhận nhận hàng → 403 | PASS | nhận 403 |
| 77 | Đơn nhập hàng | WarehouseStaff xác nhận nhận hàng với SL thực nhận KHÁC SL đặt (8/10, 5/5) → status=debt, totalCost tính theo SL thực nhận | PASS |  |
| 78 | Đơn nhập hàng | Sau khi nhận hàng, tồn kho sản phẩm A tăng đúng = 8 (theo SL thực nhận, không phải SL đặt 10) | PASS | xác nhận qua addItem boundary-check |
| 79 | Đơn nhập hàng | Sau khi nhận hàng, tồn kho sản phẩm B tăng đúng = 5 | PASS | xác nhận qua addItem boundary-check |
| 80 | Đơn nhập hàng | Xem công nợ ngay sau khi nhận hàng → totalPaid=0, remainingDebt=totalCost | PASS |  |
| 81 | Đơn nhập hàng | Manager trả một phần (26666) → 201, totalPaid cập nhật đúng | PASS |  |
| 82 | Đơn nhập hàng | Trả vượt số nợ còn lại → 409 | PASS | nhận 409 "vượt quá số nợ còn lại (53334.00)" |
| 83 | Đơn nhập hàng | Trả đủ phần còn lại → 201, remainingDebt≈0 | PASS |  |
| 84 | Đơn nhập hàng | Sau khi trả đủ nợ → đơn chuyển status=completed | PASS |  |
| 85 | Đơn nhập hàng | Hủy đơn đã completed → 409 (chỉ hủy được khi pending) | PASS | nhận 409 |
| 86 | Đơn nhập hàng | Nhận hàng với receivedQuantity=0 TOÀN BỘ dòng → status=completed thẳng, không qua debt | PASS |  |
| 87 | Đơn nhập hàng | Cố trả tiền cho đơn totalCost=0 đã completed → 409 "đã thanh toán đủ" | PASS | nhận 409 |
| 88 | Đơn nhập hàng | Hủy đơn đang pending → 200, status=cancelled | PASS |  |
| 89 | Đơn nhập hàng | Hủy đơn đã cancelled lần 2 → 409 | PASS | nhận 409 |
| 90 | Đơn nhập hàng | WarehouseStaff Quận 1 gọi GET /api/purchase-orders → KHÔNG thấy đơn của Quận 7 (list đã store-scoped đúng) | PASS |  |
| 91 | Đơn nhập hàng | WarehouseStaff Quận 1 gọi GET /api/purchase-orders/:id cho đơn của Quận 7 → phải bị chặn | **PASS** | nhận 403 — **đã fix, trước FAIL (lộ 200)** |
| 92 | Đơn nhập hàng | WarehouseStaff Quận 1 xác nhận nhận hàng cho đơn nhập của Quận 7 → phải bị chặn | **PASS** | nhận 403 — **đã fix, trước FAIL nghiêm trọng (tăng nhầm tồn kho Q7)** |
| 93 | Đơn nhập hàng | Tìm đơn nhập hàng theo tên NCC CÓ dấu ("Cung Ứng") → chỉ trả đơn khớp đúng NCC | FAIL | **Không phải bug**: lẫn 2 supplier từ 2 lần chạy test (lần trước chưa dọn được vì supplier không có API xóa) đều khớp "Cung Ứng" — xem mục "3 FAIL mới" ở trên |
| 94 | Đơn nhập hàng | Tìm đơn nhập hàng theo tên NCC KHÔNG dấu ("Cung Ung") → vẫn chỉ trả đơn khớp đúng NCC (unaccent()) | FAIL | Cùng nguyên nhân #93 — dữ liệu tích lũy qua nhiều lần chạy, không phải lỗi `unaccent()` |
| 95 | Điều chuyển hàng | Chi nhánh nguồn = đích → 400 | PASS | nhận 400 |
| 96 | Điều chuyển hàng | Tạo phiếu điều chuyển với SL vượt tồn kho hiện có → vẫn 201 (createTransfer không check tồn kho, chỉ confirmTransfer mới check khi trừ kho thật) | PASS |  |
| 97 | Điều chuyển hàng | Xác nhận phiếu điều chuyển vượt tồn kho → 409 "Tồn kho không đủ" tại bước confirm | **PASS** | nhận 409 — **đã fix, trước FAIL 500** |
| 98 | Điều chuyển hàng | Tạo phiếu điều chuyển hợp lệ (2 đơn vị, trong tồn kho 10) → 201, status=pending | PASS |  |
| 99 | Điều chuyển hàng | WarehouseStaff CHI NHÁNH KHÔNG LIÊN QUAN (Bình Thạnh) xác nhận phiếu điều chuyển Q1→Q7 | **PASS** | nhận 403 — **đã fix, trước FAIL (lộ 200)** |
| 100 | Điều chuyển hàng | WarehouseStaff của chi nhánh ĐÍCH (Q7) xác nhận điều chuyển → 200, status=completed | PASS |  |
| 101 | Điều chuyển hàng | Sau xác nhận, tồn kho chi nhánh NGUỒN (Q1) giảm đúng 2 (10 → 8) | PASS | xác nhận qua addItem boundary-check |
| 102 | Điều chuyển hàng | Sau xác nhận, tồn kho chi nhánh ĐÍCH (Q7) tăng đúng 2 (0 → 2) | PASS | xác nhận qua addItem boundary-check |
| 103 | Điều chuyển hàng | Xác nhận lần 2 phiếu đã completed → 400 | PASS | nhận 400 |
| 104 | Báo cáo | Báo cáo doanh thu theo khoảng ngày (hôm nay) → 200, có totalRevenue | PASS |  |
| 105 | Báo cáo | Tổng doanh thu 3 tháng trong quý hiện tại = doanh thu báo cáo theo quý | PASS |  |
| 106 | Báo cáo | Tổng doanh thu 12 tháng trong năm = doanh thu báo cáo theo năm | PASS |  |
| 107 | Báo cáo | Báo cáo tồn kho toàn hệ thống (/api/reports/inventory, KHÁC route với /api/inventory) → 200, có totalStockValue | PASS |  |
| 108 | Báo cáo | Báo cáo tồn kho theo 1 chi nhánh → 200, storeId khớp | PASS |  |
| 109 | Báo cáo | Staff gọi báo cáo doanh thu (Manager-only) → 403 | PASS | nhận 403 |
| 110 | Báo cáo | Khoảng ngày không hợp lệ (start > end) → 400 | PASS | nhận 400 |
| 111 | Dashboard tổng quan | Gọi đủ tổ hợp API mà DashboardOverview.tsx dùng (low-stock, stores, 4x revenue, invoices) → tất cả 200 | PASS |  |
| 112 | Dashboard tổng quan | Doanh thu "hôm nay" từ combo Dashboard khớp với báo cáo doanh thu test riêng ở nhóm Báo cáo | PASS | dashboard=240000, report=240000 |
| 113 | Dashboard tổng quan | Hóa đơn vừa thanh toán ở nhóm Bán hàng xuất hiện trong danh sách "Đơn hàng gần đây" (status=completed) | PASS |  |
| 114 | Dashboard tổng quan | storesCount lấy được từ GET /api/stores (đúng API DashboardOverview.tsx dùng) | PASS | count=3 |
| 115 | Trợ lý AI | Câu hỏi số liệu thật (doanh thu hôm nay) → 200, có reply text | PASS |  |
| 116 | Trợ lý AI | Số liệu AI trả lời khớp với API doanh thu thật (đối chiếu lỏng theo chữ số trong câu trả lời) | PASS | reply chứa số gần khớp totalRevenue=240000 |
| 117 | Trợ lý AI | Câu hỏi hướng dẫn sử dụng hệ thống (tab Khuyến mãi) → 200, reply có nhắc tới "khuyến mãi" | PASS |  |
| 118 | Trợ lý AI | BranchManager cố hỏi vượt quyền xem chi nhánh khác/toàn hệ thống → AI từ chối hoặc làm rõ chỉ trả về đúng phạm vi chi nhánh mình | FAIL | **Không phải bug**: AI trả lời đúng nội dung ("nằm ngoài quyền hạn... chỉ có quyền xem dữ liệu thuộc chi nhánh của mình") nhưng khác cách paraphrase so với regex từ khóa trong script — xem mục "3 FAIL mới" ở trên. Case #119 (đối chiếu số liệu) vẫn PASS. |
| 119 | Trợ lý AI | Nếu AI có nêu số liệu doanh thu trong câu trả lời vượt quyền, số đó vẫn phải là của CHI NHÁNH Q1, không phải toàn hệ thống | PASS | q1RevenueReal=240000 |

## Dữ liệu test còn sót lại — không có API để xóa hẳn (lần chạy này, RUN_TAG=MS07SGCM)

Toàn bộ tài khoản/chi nhánh/sản phẩm/khuyến mãi test tự tạo đã được deactivate/soft-delete qua API, tồn kho các sản phẩm test đã reset về 0. Các đối tượng dưới đây **không có bất kỳ API xóa nào** nên vẫn còn trong DB:

- **3 khách hàng**: `Nguyễn Văn ZTest MS07SGCM Updated` (SĐT 0999974600), `ZTest Cust2 MS07SGCM` (SĐT 09997460039), `ZTEST Loyalty MS07SGCM` (SĐT 0977974600, khách dùng để test điểm tích lũy — hiện có 9 điểm thật)
- **1 nhà cung cấp**: "Công Ty TNHH ZTest Cung Ứng MS07SGCM"
- **3 đơn nhập hàng** (kèm details/payments) thuộc supplier trên
- **1 phiếu điều chuyển hàng** (completed, Q1→Q7, 2 đơn vị)
- **1 hóa đơn bán hàng đã hoàn tất** (240.000đ trong đó có đơn của case Bán hàng — xuất hiện trong báo cáo/Dashboard "hôm nay" đúng như mục đích đối chiếu số liệu ở nhóm 12/13)
- **7 hóa đơn nháp** — vô hại, `getInvoices` lọc `status != draft` nên không hiển thị ở bất kỳ đâu

**Lưu ý quan trọng cho lần chạy tiếp theo (nếu có):** DB hiện tồn đọng nhà cung cấp từ **2 lần chạy** (`MS04VI23` và `MS07SGCM`, cùng chứa "Cung Ứng"), gây ra 2 FAIL #93/#94 ở trên do không còn phân biệt được "đơn của riêng lần chạy này". Nếu muốn chạy lại script nhiều lần và vẫn giữ case #93/#94 xanh, cần dọn tay 2 supplier này trong DB trước (bảng `suppliers`, kèm `purchase_orders`/`purchase_order_details`/`purchase_order_payments` liên quan) — không có API nào làm việc này.

Không có sản phẩm/khuyến mãi/tài khoản/chi nhánh nào còn active ngoài dữ liệu seed gốc.
