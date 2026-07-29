# TEST_RESULTS — Kiểm thử tự động tầng API (TTDATN)

Chạy lúc: 07:03:03 29/7/2026 (giờ VN) — RUN_TAG=MS5BMQLN

**Tổng số test case: 125** — PASS: **123** — FAIL: **1** — N/A (không thể test / không áp dụng, xem ghi chú): **1**

Script test: Node.js, dùng `fetch` (built-in Node 24, không cần axios), chạy trực tiếp trên DB local (`npm run dev`), đọc code backend thật (controller/service/route) trước khi viết từng test case — không đoán shape response. Đây là **script y hệt 2 lần chạy trước** (`MS04VI23`, `MS07SGCM`), chỉ bổ sung 7 test case mới cho tính năng BranchManager xác nhận đặt hàng (state machine `pending → ordered → debt|completed`, trước đây N/A vì API chưa tồn tại) và sửa 2 luồng cũ (đơn nhập hàng chính + đơn `receivedQuantity=0`) để chèn bước xác nhận đặt hàng trước khi WarehouseStaff nhận hàng, khớp với state machine mới. Dữ liệu test tự tạo đã được dọn sạch ở cuối script (deactivate/soft-delete qua API cho tài khoản/chi nhánh/sản phẩm/khuyến mãi, reset tồn kho về 0); phần không có API xóa được liệt kê ở mục cuối file.

## Việc đã làm trong lần chạy này

1. **Mở lại đúng script cũ** (lúc đó là `api-test.mjs`, được tìm thấy trong scratchpad của phiên trước) thay vì viết lại từ đầu. **Cập nhật:** script và file này đã được chuyển vào `test/` ở gốc dự án (`test/api-test.mjs`, `test/TEST_RESULTS.md`) để có vị trí cố định, không còn nằm ở thư mục tạm ngoài dự án.
2. **Thêm 7 test case mới** cho `PUT /api/purchase-orders/:id/confirm-order` (BranchManager xác nhận đặt hàng) — xem bảng "7 case mới" bên dưới.
3. **Sửa 2 luồng cũ** (đơn nhập hàng chính đi tới `debt→completed`, và đơn `receivedQuantity=0`) để chèn bước `confirm-order` trước khi gọi `confirm` — bắt buộc vì state machine mới không còn cho WarehouseStaff xác nhận nhận hàng thẳng từ `pending`.
4. **Chạy lại toàn bộ 125 case** (không chỉ 7 case mới) để xác nhận không có gì bị ảnh hưởng bởi thay đổi state machine.
5. **Dọn dữ liệu tồn đọng từ 2 lần chạy trước**: phát hiện 3 nhà cung cấp `"...ZTest Cung Ứng ..."` tồn đọng trong DB (từ `MS04VI23`, `MS07SGCM`, và nhà cung cấp của chính lần chạy đầu tiên trong phiên này) — đây là nguyên nhân gây FAIL giả ở case tìm-theo-tên-NCC trong 2 lần chạy trước. Vì `suppliers`/`purchase_orders` không có API xóa, đã xin phép người dùng và thực hiện **xóa trực tiếp qua SQL** (transaction, cascade đúng thứ tự `purchase_order_payments → purchase_order_details → purchase_orders → suppliers`, chỉ nhắm đúng pattern tên `%ZTest%Cung%`, không đụng dữ liệu seed thật) — sau đó **chạy lại toàn bộ script lần thứ 2 trên DB đã sạch** để có kết quả phản ánh đúng, và **dọn luôn cả nhà cung cấp của chính lần chạy được báo cáo này** ngay sau khi test xong. DB hiện không còn nhà cung cấp `ZTest` nào.

## 7 test case mới — BranchManager xác nhận đặt hàng (state machine `pending → ordered`)

| STT | Test case | Kết quả | Ghi chú |
|---|---|---|---|
| 1 | Manager tạo đơn nhập hàng → status pending | PASS | |
| 2 | BranchManager **SAI chi nhánh** (Quận 7) cố xác nhận đặt hàng đơn của Quận 1 → phải bị chặn | **PASS** | nhận **403** đúng như kỳ vọng |
| 3 | BranchManager **ĐÚNG chi nhánh** (Quận 1) xác nhận đặt hàng → status chuyển ordered | PASS | nhận 200, status=ordered |
| 4 | WarehouseStaff cố xác nhận nhận hàng khi đơn **CÒN pending** (đơn khác, chưa qua bước BranchManager) → phải bị chặn | **PASS** | nhận **409** — không cho xác nhận thẳng từ pending, đúng thiết kế mới |
| 5 | WarehouseStaff xác nhận nhận hàng đơn đã ở ordered → chuyển debt/completed bình thường như luồng cũ | PASS | status sau khi nhận = debt |
| 6 | Manager huỷ đơn khi đang ở ordered (chưa nhận hàng) → phải huỷ được | PASS | nhận 200, status=cancelled |
| 7 | GET /api/purchase-orders bằng BranchManager → chỉ thấy đơn đúng chi nhánh mình | PASS | không thấy đơn của Quận 7 |

**Case 2 và case 4 (2 case chặn quan trọng nhất) đều PASS đúng như kỳ vọng** — không có lỗ hổng phân quyền hay lỗ hổng state-machine nào phát sinh từ tính năng mới.

## So với lần chạy trước (114 PASS / 3 FAIL / 2 N/A, 119 case → 123 PASS / 1 FAIL / 1 N/A, 125 case)

- **+7 case mới** (BranchManager xác nhận đặt hàng, bảng trên) — tất cả PASS.
- **-1 case N/A cũ bị loại bỏ**: ghi chú "bước BranchManager xác nhận đặt hàng không tồn tại" không còn đúng (tính năng đã có) — xóa khỏi bảng, thay bằng 7 case thật.
- **2 FAIL cũ (tìm NCC theo tên, case #93/#94 lần trước) nay đã PASS** — nguyên nhân gốc (2 nhà cung cấp rác từ 2 lần chạy trước cùng khớp "Cung Ứng") đã được dọn sạch qua SQL trực tiếp (xem "Việc đã làm" ở trên). Đây là lần đầu tiên case này PASS sau 3 lần chạy liên tiếp.
- **1 FAIL cũ (AI trả lời đúng nhưng lệch từ khóa regex, case #118 lần trước) nay đã PASS** — do câu trả lời AI lần này paraphrase khớp đúng regex kiểm tra trong script (không phải do script hay AI được sửa, chỉ là biến thiên tự nhiên của LLM output giữa các lần gọi — đã ghi nhận rủi ro này từ lần chạy trước).
- **1 FAIL MỚI phát hiện** (case Tồn kho, xem bên dưới) — **là một regression thật, không liên quan gì tới BranchManager**.

## FAIL — regression thật phát hiện được, KHÔNG liên quan tới BranchManager

**`GET /api/inventory?storeId=` → 500** (bug tuần 5 đã từng được fix, nhưng **đã tái diễn**): đọc trực tiếp `backend/src/services/Inventory.service.ts` xác nhận `getStockByStore()` include `Product → Category` **không có `as: 'category'`** — tái phát sinh bởi commit gần đây nhất trên file này, `7b203f0 "fix tồn kho"` (thêm tính năng storeId optional / tổng thể), commit đó vô tình bỏ mất `as: 'category'` đã có ở include Category trong lúc viết lại hàm. Toàn bộ tab "Tồn kho" (`WarehouseManagement.tsx` → `fetchStockByStore` → `GET /api/inventory`) đang lỗi 500 100% số lần gọi ngay tại thời điểm chạy test này, y hệt triệu chứng bug tuần 5. **Ngoài phạm vi yêu cầu của lần chạy này (không sửa)** nhưng cần báo ngay vì đây là regression đang sống trên `main`.

## Phát hiện phụ (không phản ánh trong bảng PASS/FAIL vì không tái hiện được ở lần chạy được báo cáo) — cảnh báo cho người đọc

Trong lần chạy đầu tiên của phiên này (trước khi dọn NCC rác, không phải RUN_TAG được báo cáo chính), 2 case đối chiếu số liệu AI-doanh thu FAIL vì `totalRevenue` "hôm nay" trả về **0** dù vừa có hóa đơn thanh toán thành công. Điều tra cho thấy đây **không phải lỗi ngẫu nhiên** mà là hệ quả của 2 vấn đề cộng dồn, tái hiện được bất cứ khi nào chạy vào khung giờ 00:00–07:00 giờ VN (UTC+7):
1. `toDateParam()` (`frontend/src/services/reportApi.ts`, dùng bởi `DashboardOverview.tsx`) và script test đều tính "hôm nay" bằng `new Date().toISOString().slice(0,10)` — đây là **ngày theo UTC**, không phải ngày theo lịch địa phương. Trong khung giờ 00:00–06:59 giờ VN, ngày UTC vẫn còn là "hôm qua" theo lịch VN, nên "hôm nay" bị tính nhầm sang ngày trước.
2. `report.controller.ts getRevenueReport` xử lý `startDate`/`endDate` không nhất quán múi giờ: `start = new Date(startDate)` giữ nguyên UTC-midnight, nhưng `end.setHours(23,59,59,999)` set theo **giờ địa phương của máy chủ**. Với múi giờ UTC+7, kết quả là khoảng truy vấn thực tế (quy đổi ra giờ VN) chỉ là **[07:00 → 23:59:59.999]** của ngày đó — **luôn luôn bỏ sót mọi giao dịch diễn ra từ 00:00–06:59 giờ VN**, không phụ thuộc vào lúc nào chạy test.

Đây là một bug thật về độ chính xác báo cáo doanh thu (ảnh hưởng cả Dashboard lẫn báo cáo doanh thu), độc lập với tính năng BranchManager, **chưa được sửa** (ngoài phạm vi yêu cầu lần này) — nên đưa vào backlog riêng. Lần chạy được báo cáo chính thức ở trên (07:03 giờ VN, đã qua mốc 07:00) không rơi vào khung giờ lỗi nên không thấy FAIL, nhưng bug vẫn tồn tại trong code.

## 1 mục N/A — lý do cụ thể

- **redeemPoints**: đã grep `SalesManagement.tsx` và `CustomerManagement.tsx` — không có call site nào gọi `POST /api/loyalty-points/redeem`. Chỉ tồn tại ở backend, chưa được nối UI nào. Theo yêu cầu, bỏ qua viết test case cho tính năng chưa dùng.

## Bảng chi tiết 125 test case

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
| 28 | Sản phẩm | Tạo 5 sản phẩm liên tiếp (tuần tự) → không 500, SKU không trùng | PASS | skus=SP0061..SP0065 |
| 29 | Sản phẩm | Tạo 5 sản phẩm ĐỒNG THỜI (Promise.all) → không 500, SKU trong số request thành công không trùng | PASS | 201=1 409=4 500=0 |
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
| 54 | Bán hàng | Tự động áp KM tốt nhất lần 1 → discountAmount khớp tính toán độc lập | PASS |  |
| 55 | Bán hàng | Sửa giỏ hàng sau khi đã áp KM (tăng SL sản phẩm A từ 3 lên 5) → 200 | PASS |  |
| 56 | Bán hàng | Sau khi sửa giỏ, tự động áp lại KM → tính lại đúng theo subtotal MỚI | PASS |  |
| 57 | Bán hàng | Gắn khách hàng với customerId không tồn tại vào hóa đơn → 404 | PASS | nhận 404 "Không tìm thấy khách hàng" |
| 58 | Bán hàng | Gắn khách hàng vào hóa đơn (PATCH /api/invoices/:id/customer, hóa đơn còn draft) → 200 | PASS |  |
| 59 | Bán hàng | Thanh toán thiếu tiền → 422 "Số tiền không đủ" | PASS | nhận 422 |
| 60 | Bán hàng | Thanh toán đủ tiền → 200, status=completed | PASS |  |
| 61 | Bán hàng | Sau thanh toán, tồn kho sản phẩm A giảm đúng 5 (20 → 15) | PASS | xác nhận qua addItem boundary-check |
| 62 | Bán hàng | Sau thanh toán, tồn kho sản phẩm B giảm đúng 1 (2 → 1) | PASS | xác nhận qua addItem boundary-check |
| 63 | Bán hàng | Điểm tích lũy cộng đúng sau thanh toán = floor(totalAmount/10000) | PASS | before=0, totalAmount=90.000đ, sau=9 |
| 64 | Bán hàng | redeemPoints (đổi điểm tích lũy lấy giảm giá) | N/A | Không có UI nào gọi — xem mục N/A ở trên |
| 65 | Lịch sử đơn hàng | Lọc lịch sử đơn hàng theo khoảng ngày (hôm nay) → thấy hóa đơn vừa thanh toán | PASS |  |
| 66 | Lịch sử đơn hàng | Tìm kiếm lịch sử đơn hàng theo (một phần) mã hóa đơn → thấy kết quả khớp | PASS |  |
| 67 | Lịch sử đơn hàng | Manager lọc lịch sử theo storeId=Quận 1 → thấy hóa đơn của Quận 1 | PASS |  |
| 68 | Lịch sử đơn hàng | Manager lọc lịch sử theo storeId=Quận 7 → KHÔNG thấy hóa đơn của Quận 1 | PASS |  |
| 69 | Tồn kho | Xem tồn kho theo chi nhánh (GET /api/inventory?storeId=) → 200, trả về mảng | **FAIL** | **LỖI THẬT — regression tái diễn**: nhận 500 "Category is associated to Product using an alias...". `Inventory.service.ts getStockByStore()` include Category thiếu `as: 'category'` — tái phát bởi commit `7b203f0 "fix tồn kho"`. Xem mục riêng ở trên. |
| 70 | Tồn kho | Cập nhật tay tồn kho (PUT /api/inventory/:productId) → 200, giá trị mới đúng | PASS | không bị ảnh hưởng bởi bug ở #69 — route/code khác |
| 71 | Tồn kho | Sản phẩm vừa hạ tồn kho dưới ngưỡng (3 < 10) → xuất hiện trong danh sách sắp hết hàng | PASS |  |
| 72 | Tồn kho | Staff (không phải Manager/WarehouseStaff) gọi GET /api/inventory → 403 | PASS | nhận 403 |
| 73 | Đơn nhập hàng | Tạo nhà cung cấp mới (POST /api/suppliers) → 201 | PASS |  |
| 74 | Đơn nhập hàng | Manager tạo đơn nhập hàng (2 dòng sản phẩm) → 201, status=pending | PASS |  |
| 75 | Đơn nhập hàng | Staff (không phải WarehouseStaff) xác nhận nhận hàng → 403 | PASS | nhận 403 |
| 76 | Đơn nhập hàng | WarehouseStaff xác nhận nhận hàng với SL thực nhận KHÁC SL đặt (8/10, 5/5) → status=debt | PASS | (đã qua bước BranchManager confirm-order trước, theo state machine mới) |
| 77 | Đơn nhập hàng | Sau khi nhận hàng, tồn kho sản phẩm A tăng đúng = 8 | PASS | xác nhận qua addItem boundary-check |
| 78 | Đơn nhập hàng | Sau khi nhận hàng, tồn kho sản phẩm B tăng đúng = 5 | PASS | xác nhận qua addItem boundary-check |
| 79 | Đơn nhập hàng | Xem công nợ ngay sau khi nhận hàng → totalPaid=0, remainingDebt=totalCost | PASS |  |
| 80 | Đơn nhập hàng | Manager trả một phần (26666) → 201, totalPaid cập nhật đúng | PASS |  |
| 81 | Đơn nhập hàng | Trả vượt số nợ còn lại → 409 | PASS | nhận 409 |
| 82 | Đơn nhập hàng | Trả đủ phần còn lại → 201, remainingDebt≈0 | PASS |  |
| 83 | Đơn nhập hàng | Sau khi trả đủ nợ → đơn chuyển status=completed | PASS |  |
| 84 | Đơn nhập hàng | Hủy đơn đã completed → 409 (chỉ hủy được khi pending/ordered) | PASS | nhận 409 |
| 85 | Đơn nhập hàng | Nhận hàng với receivedQuantity=0 TOÀN BỘ dòng → status=completed thẳng, không qua debt | PASS | (đã qua bước BranchManager confirm-order trước) |
| 86 | Đơn nhập hàng | Cố trả tiền cho đơn totalCost=0 đã completed → 409 "đã thanh toán đủ" | PASS | nhận 409 |
| 87 | Đơn nhập hàng | Hủy đơn đang pending → 200, status=cancelled | PASS |  |
| 88 | Đơn nhập hàng | Hủy đơn đã cancelled lần 2 → 409 | PASS | nhận 409 |
| 89 | Đơn nhập hàng | **[Case 1 mới]** Manager tạo đơn nhập hàng cho luồng BranchManager xác nhận đặt hàng → 201, status=pending | **PASS** |  |
| 90 | Đơn nhập hàng | **[Case 2 mới]** BranchManager SAI chi nhánh (Quận 7) cố xác nhận đặt hàng cho đơn của Quận 1 → phải bị chặn | **PASS** | nhận 403 |
| 91 | Đơn nhập hàng | **[Case 3 mới]** BranchManager ĐÚNG chi nhánh (Quận 1) xác nhận đặt hàng → status chuyển ordered | **PASS** |  |
| 92 | Đơn nhập hàng | **[Case 4 mới]** WarehouseStaff cố xác nhận nhận hàng khi đơn CÒN đang pending → phải bị chặn | **PASS** | nhận 409 |
| 93 | Đơn nhập hàng | **[Case 5 mới]** WarehouseStaff xác nhận nhận hàng đơn đã ở ordered → chuyển debt/completed bình thường | **PASS** | status sau khi nhận = debt |
| 94 | Đơn nhập hàng | **[Case 6 mới]** Manager huỷ đơn khi đang ở ordered (chưa nhận hàng) → phải huỷ được | **PASS** |  |
| 95 | Đơn nhập hàng | WarehouseStaff Quận 1 gọi GET /api/purchase-orders → KHÔNG thấy đơn của Quận 7 | PASS |  |
| 96 | Đơn nhập hàng | WarehouseStaff Quận 1 gọi GET /api/purchase-orders/:id cho đơn của Quận 7 → phải bị chặn | PASS | nhận 403 |
| 97 | Đơn nhập hàng | WarehouseStaff Quận 1 xác nhận nhận hàng cho đơn nhập của Quận 7 → phải bị chặn | PASS | nhận 403 |
| 98 | Đơn nhập hàng | **[Case 7 mới]** GET /api/purchase-orders bằng BranchManager (Quận 1) → chỉ thấy đơn đúng chi nhánh mình | **PASS** |  |
| 99 | Đơn nhập hàng | Tìm đơn nhập hàng theo tên NCC CÓ dấu ("Cung Ứng") → chỉ trả đơn khớp đúng NCC | PASS | (đã hết FAIL sau khi dọn NCC rác tồn đọng) |
| 100 | Đơn nhập hàng | Tìm đơn nhập hàng theo tên NCC KHÔNG dấu ("Cung Ung") → vẫn chỉ trả đơn khớp đúng NCC | PASS | (đã hết FAIL sau khi dọn NCC rác tồn đọng) |
| 101 | Điều chuyển hàng | Chi nhánh nguồn = đích → 400 | PASS | nhận 400 |
| 102 | Điều chuyển hàng | Tạo phiếu điều chuyển với SL vượt tồn kho hiện có → vẫn 201 | PASS |  |
| 103 | Điều chuyển hàng | Xác nhận phiếu điều chuyển vượt tồn kho → 409 "Tồn kho không đủ" | PASS | nhận 409 |
| 104 | Điều chuyển hàng | Tạo phiếu điều chuyển hợp lệ (2 đơn vị, trong tồn kho 10) → 201, status=pending | PASS |  |
| 105 | Điều chuyển hàng | WarehouseStaff CHI NHÁNH KHÔNG LIÊN QUAN (Bình Thạnh) xác nhận phiếu Q1→Q7 → phải bị chặn | PASS | nhận 403 |
| 106 | Điều chuyển hàng | WarehouseStaff của chi nhánh ĐÍCH (Q7) xác nhận điều chuyển → 200, status=completed | PASS |  |
| 107 | Điều chuyển hàng | Sau xác nhận, tồn kho chi nhánh NGUỒN (Q1) giảm đúng 2 (10 → 8) | PASS | xác nhận qua addItem boundary-check |
| 108 | Điều chuyển hàng | Sau xác nhận, tồn kho chi nhánh ĐÍCH (Q7) tăng đúng 2 (0 → 2) | PASS | xác nhận qua addItem boundary-check |
| 109 | Điều chuyển hàng | Xác nhận lần 2 phiếu đã completed → 400 | PASS | nhận 400 |
| 110 | Báo cáo | Báo cáo doanh thu theo khoảng ngày (hôm nay) → 200, có totalRevenue | PASS |  |
| 111 | Báo cáo | Tổng doanh thu 3 tháng trong quý hiện tại = doanh thu báo cáo theo quý | PASS |  |
| 112 | Báo cáo | Tổng doanh thu 12 tháng trong năm = doanh thu báo cáo theo năm | PASS |  |
| 113 | Báo cáo | Báo cáo tồn kho toàn hệ thống (/api/reports/inventory, KHÁC route /api/inventory) → 200 | PASS |  |
| 114 | Báo cáo | Báo cáo tồn kho theo 1 chi nhánh → 200, storeId khớp | PASS |  |
| 115 | Báo cáo | Staff gọi báo cáo doanh thu (Manager-only) → 403 | PASS | nhận 403 |
| 116 | Báo cáo | Khoảng ngày không hợp lệ (start > end) → 400 | PASS | nhận 400 |
| 117 | Dashboard tổng quan | Gọi đủ tổ hợp API mà DashboardOverview.tsx dùng → tất cả 200 | PASS |  |
| 118 | Dashboard tổng quan | Doanh thu "hôm nay" từ combo Dashboard khớp với báo cáo doanh thu | PASS | dashboard=90000 report=90000 |
| 119 | Dashboard tổng quan | Hóa đơn vừa thanh toán xuất hiện trong "Đơn hàng gần đây" | PASS |  |
| 120 | Dashboard tổng quan | storesCount lấy được từ GET /api/stores | PASS | count=3 |
| 121 | Trợ lý AI | Câu hỏi số liệu thật (doanh thu hôm nay) → 200, có reply text | PASS |  |
| 122 | Trợ lý AI | Số liệu AI trả lời khớp với API doanh thu thật | PASS | reply chứa số gần khớp totalRevenue=90000 |
| 123 | Trợ lý AI | Câu hỏi hướng dẫn sử dụng hệ thống (tab Khuyến mãi) → 200 | PASS |  |
| 124 | Trợ lý AI | BranchManager cố hỏi vượt quyền xem chi nhánh khác/toàn hệ thống → AI từ chối/làm rõ phạm vi | PASS |  |
| 125 | Trợ lý AI | Nếu AI có nêu số liệu doanh thu vượt quyền, số đó vẫn phải là của CHI NHÁNH Q1 | PASS | q1RevenueReal=90000 |

## Dữ liệu test còn sót lại — không có API để xóa hẳn (lần chạy này, RUN_TAG=MS5BMQLN)

Toàn bộ tài khoản/chi nhánh/sản phẩm/khuyến mãi test tự tạo đã được deactivate/soft-delete qua API, tồn kho các sản phẩm test đã reset về 0. **Nhà cung cấp + đơn nhập hàng test đã được xóa hẳn qua SQL trực tiếp** (không còn tồn đọng — xem "Việc đã làm" ở trên). Các đối tượng dưới đây **không có bất kỳ API xóa nào** nên vẫn còn trong DB:

- **3 khách hàng**: `Nguyễn Văn ZTest MS5BMQLN Updated` (SĐT 0999283383), `ZTest Cust2 MS5BMQLN` (SĐT 09998338309), `ZTEST Loyalty MS5BMQLN` (SĐT 0977283383, hiện có 9 điểm thật)
- **1 phiếu điều chuyển hàng** (completed, Q1→Q7, 2 đơn vị)
- **1 hóa đơn bán hàng đã hoàn tất** (90.000đ — dùng để đối chiếu số liệu Báo cáo/Dashboard/AI "hôm nay")
- **7 hóa đơn nháp** — vô hại, `getInvoices` lọc `status != draft` nên không hiển thị ở bất kỳ đâu

**Nhà cung cấp/đơn nhập hàng test: đã xóa sạch qua SQL trực tiếp ngay sau khi chạy xong** (không còn tồn đọng cho lần chạy tiếp theo — khác với 2 lần trước). Không có sản phẩm/khuyến mãi/tài khoản/chi nhánh nào còn active ngoài dữ liệu seed gốc. Cũng phát hiện 1 supplier rác tên `"VERIFYMS07G4TC NCC"` (1 đơn nhập hàng liên quan) — **không khớp pattern của script này** (không phải "ZTest...Cung..."), có vẻ là tàn dư từ một phiên kiểm thử thủ công/khác trước đây, không ảnh hưởng tới bất kỳ assertion nào ở đây nên không đụng tới — cân nhắc dọn riêng nếu cần.
