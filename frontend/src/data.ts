import { Product, Employee, Customer, Invoice, Promotion, Store, PurchaseOrder } from './types';

export const initialProducts: Product[] = [
  { productId: 'SP001', productName: 'Gạo ST25 Thượng Hạng (5kg)', categoryId: 'mock-thuc-pham-kho', category: 'Thực phẩm khô', price: 195000, cost: 150000, stock: 45, status: 'Đang kinh doanh' },
  { productId: 'SP002', productName: 'Nước Mắm Nam Ngư Phú Quốc 650ml', categoryId: 'mock-gia-vi', category: 'Gia vị', price: 42000, cost: 30000, stock: 12, status: 'Đang kinh doanh' },
  { productId: 'SP003', productName: 'Mì Tôm Hảo Hảo Chua Cay (Thùng 30 gói)', categoryId: 'mock-thuc-pham-kho', category: 'Thực phẩm khô', price: 110000, cost: 92000, stock: 3, status: 'Đang kinh doanh' },
  { productId: 'SP004', productName: 'Dầu Ăn Simply Nguyên Chất 1L', categoryId: 'mock-gia-vi', category: 'Gia vị', price: 58000, cost: 46000, stock: 24, status: 'Đang kinh doanh' },
  { productId: 'SP005', productName: 'Sữa Tươi Tiệt Trùng Vinamilk (Lốc 4 hộp)', categoryId: 'mock-sua', category: 'Sữa & Sản phẩm từ sữa', price: 31000, cost: 24000, stock: 4, status: 'Đang kinh doanh' },
  { productId: 'SP006', productName: 'Nước Ngọt Coca Cola 320ml (Lốc 6 lon)', categoryId: 'mock-do-uong', category: 'Đồ uống', price: 55000, cost: 42000, stock: 18, status: 'Đang kinh doanh' },
  { productId: 'SP007', productName: 'Bột Giặt OMO Matic Cửa Trên 4.1kg', categoryId: 'mock-hoa-my-pham', category: 'Hóa mỹ phẩm', price: 215000, cost: 175000, stock: 2, status: 'Đang kinh doanh' },
  { productId: 'SP008', productName: 'Kem Đánh Răng P/S Bảo Vệ 3 Tác Động 230g', categoryId: 'mock-hoa-my-pham', category: 'Hóa mỹ phẩm', price: 38000, cost: 28000, stock: 35, status: 'Ngừng kinh doanh' },
  { productId: 'SP009', productName: 'Nước Rửa Chén Sunlight Chanh 3.6kg', categoryId: 'mock-hoa-my-pham', category: 'Hóa mỹ phẩm', price: 115000, cost: 90000, stock: 1, status: 'Đang kinh doanh' },
  { productId: 'SP010', productName: 'Giấy Vệ Sinh Pulppy (Lốc 10 cuộn)', categoryId: 'mock-hoa-my-pham', category: 'Hóa mỹ phẩm', price: 62000, cost: 48000, stock: 5, status: 'Ngừng kinh doanh' },
];

export const initialEmployees: Employee[] = [
  { id: 'NV001', name: 'Nguyễn Văn A', role: 'Quản lý', email: 'manager@retailchain.vn', phone: '0901234567', storeId: 'CH001', status: 'Đang làm việc' },
  { id: 'NV002', name: 'Trần Thị B', role: 'Nhân viên bán hàng', email: 'staff@retailchain.vn', phone: '0912345678', storeId: 'CH001', status: 'Đang làm việc' },
  { id: 'NV003', name: 'Trần Văn B', role: 'Nhân viên kho', email: 'warehouse@retailchain.vn', phone: '0923456789', storeId: 'CH001', status: 'Đang làm việc' },
  { id: 'NV004', name: 'Phạm Minh D', role: 'Nhân viên bán hàng', email: 'nv004@retailchain.vn', phone: '0934567890', storeId: 'CH002', status: 'Đang làm việc' },
  { id: 'NV005', name: 'Hoàng Thị E', role: 'Nhân viên kho', email: 'nv005@retailchain.vn', phone: '0945678901', storeId: 'CH002', status: 'Đang làm việc' },
  { id: 'NV006', name: 'Trịnh Quốc F', role: 'Nhân viên bán hàng', email: 'nv006@retailchain.vn', phone: '0956789012', storeId: 'CH003', status: 'Đang làm việc' },
];

export const initialCustomers: Customer[] = [
  { id: 'KH001', name: 'Nguyễn Thị Hồng', phone: '0908123456', loyaltyPoints: 350, tier: 'Vàng', totalSpent: 8500000, email: 'hong.nguyen@gmail.com', joinDate: '2025-01-15' },
  { id: 'KH002', name: 'Phạm Thành Nam', phone: '0918123456', loyaltyPoints: 120, tier: 'Bạc', totalSpent: 3000000, email: 'nam.pham@gmail.com', joinDate: '2025-03-22' },
  { id: 'KH003', name: 'Trần Văn Tiến', phone: '0928123456', loyaltyPoints: 1250, tier: 'Kim cương', totalSpent: 28000000, email: 'tien.tran@gmail.com', joinDate: '2024-08-05' },
  { id: 'KH004', name: 'Lê Thu Thủy', phone: '0938123456', loyaltyPoints: 45, tier: 'Đồng', totalSpent: 980000, email: 'thuy.le@gmail.com', joinDate: '2026-02-10' },
  { id: 'KH005', name: 'Vũ Minh Đức', phone: '0948123456', loyaltyPoints: 560, tier: 'Vàng', totalSpent: 12400000, email: 'duc.vu@gmail.com', joinDate: '2025-11-30' },
];

export const initialInvoices: Invoice[] = [
  { invoiceId: 'HD001', staffId: 'NV002', staffName: 'Trần Thị B', customerName: 'Nguyễn Thị Hồng', customerId: 'KH001', totalAmount: 435000, date: '2026-05-20 10:15', storeName: 'Chi nhánh Quận 1', status: 'Hoàn thành', productsSummary: 'Mì Tôm Hảo Hảo (Thùng 30 gói) x1, Sữa TH True Milk x4', discountAmount: 45000 },
  { invoiceId: 'HD002', staffId: 'NV002', staffName: 'Trần Thị B', customerName: 'Phạm Thành Nam', customerId: 'KH002', totalAmount: 1150000, date: '2026-05-20 11:30', storeName: 'Chi nhánh Quận 1', status: 'Hoàn thành', productsSummary: 'Gạo ST25 Thượng Hạng (5kg) x4, Dầu ăn Simply 2L x2', discountAmount: 115000 },
  { invoiceId: 'HD003', staffId: 'NV004', staffName: 'Phạm Minh D', customerName: 'Trần Văn Tiến', customerId: 'KH003', totalAmount: 3200000, date: '2026-05-20 11:45', storeName: 'Chi nhánh Thảo Điền', status: 'Hoàn thành', productsSummary: 'Bia Heineken (Thùng 24 lon) x5, Đậu phộng sấy x10', discountAmount: 320000 },
  { invoiceId: 'HD004', staffId: 'NV006', staffName: 'Trịnh Quốc F', customerName: 'Khách vãng lai', totalAmount: 95000, date: '2026-05-20 12:00', storeName: 'Chi nhánh Bình Thạnh', status: 'Hoàn thành', productsSummary: 'Nước rửa chén Sunlight Chanh 3.6kg x1', discountAmount: 0 },
  { invoiceId: 'HD005', staffId: 'NV002', staffName: 'Trần Thị B', customerName: 'Lê Thu Thủy', customerId: 'KH004', totalAmount: 110000, date: '2026-05-20 13:10', storeName: 'Chi nhánh Quận 1', status: 'Đang xử lý', productsSummary: 'Sữa tươi tiệt trùng Vinamilk x10', discountAmount: 10000 },
  { invoiceId: 'HD006', staffId: 'NV004', staffName: 'Phạm Minh D', customerName: 'Vũ Minh Đức', customerId: 'KH005', totalAmount: 250000, date: '2026-05-19 15:30', storeName: 'Chi nhánh Thảo Điền', status: 'Hoàn thành', productsSummary: 'Dầu gội Clear thảo dược 650g x1', discountAmount: 25050 },
  { invoiceId: 'HD007', staffId: 'NV006', staffName: 'Trịnh Quốc F', customerName: 'Khách vãng lai', totalAmount: 125000, date: '2026-05-19 18:20', storeName: 'Chi nhánh Bình Thạnh', status: 'Đã hủy', productsSummary: 'Mì Tôm Hảo Hảo x10, Cocacola x6', discountAmount: 0 },
];

export const initialPromotions: Promotion[] = [
  { id: 'KM001', name: 'Chào Hè Rực Rỡ 10%', type: 'Phần trăm', value: 10, startDate: '2026-05-01', endDate: '2026-05-31', status: 'Đang áp dụng', minSpend: 150000 },
  { id: 'KM002', name: 'Khuyễn mãi sữa sạch TH True Milk', type: 'Đồng giá', value: 24000, startDate: '2026-05-15', endDate: '2026-05-25', status: 'Đang áp dụng', minSpend: 50000 },
  { id: 'KM003', name: 'Giảm giá hóa đơn lớn cuối tuần', type: 'Giảm tiền mặt', value: 50000, startDate: '2026-05-10', endDate: '2026-05-31', status: 'Đang áp dụng', minSpend: 500000 },
  { id: 'KM004', name: 'Tri ân Giải Phóng Miền Nam 30/4', type: 'Phần trăm', value: 15, startDate: '2026-04-25', endDate: '2026-05-02', status: 'Hết hạn', minSpend: 100000 },
  { id: 'KM005', name: 'Xả kho tết âm lịch 2026', type: 'Giảm tiền mặt', value: 100000, startDate: '2026-01-20', endDate: '2026-02-10', status: 'Vô hiệu hóa', minSpend: 1000000 },
];

export const initialStores: Store[] = [
  { id: 'CH001', storeName: 'Chi nhánh Quận 1', address: '120 Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM', phone: '02838333333', managerName: 'Nguyễn Văn A' },
  { id: 'CH002', storeName: 'Chi nhánh Thảo Điền', address: '45 Thảo Điền, Quận 2, TP. HCM', phone: '02838444444', managerName: 'Trương Hoàng Hải' },
  { id: 'CH003', storeName: 'Chi nhánh Bình Thạnh', address: '19 Bùi Đình Túy, Quận Bình Thạnh, TP. HCM', phone: '02838555555', managerName: 'Bùi Thế Sơn' },
];

export const initialPurchaseOrders: PurchaseOrder[] = [
  { orderId: 'DN001', supplierName: 'Công ty Cổ phần Vinamilk', storeId: 'CH001', storeName: 'Chi nhánh Quận 1', status: 'Đã nhập kho', totalCost: 12000000, date: '2026-05-18' },
  { orderId: 'DN002', supplierName: 'Nhà phân phối Acecook Miền Nam', storeId: 'CH001', storeName: 'Chi nhánh Quận 1', status: 'Chờ xác nhận', totalCost: 5500000, date: '2026-05-20' },
  { orderId: 'DN003', supplierName: 'Unilever Việt Nam', storeId: 'CH002', storeName: 'Chi nhánh Thảo Điền', status: 'Chờ xác nhận', totalCost: 8200000, date: '2026-05-20' },
  { orderId: 'DN004', supplierName: 'Công ty Unilever Việt Nam', storeId: 'CH003', storeName: 'Chi nhánh Bình Thạnh', status: 'Đã nhập kho', totalCost: 14500000, date: '2026-05-19' },
  { orderId: 'DN005', supplierName: 'Tổng công ty Sabeco', storeId: 'CH001', storeName: 'Chi nhánh Quận 1', status: 'Đã hủy', totalCost: 25000000, date: '2026-05-15' },
];

// Revenue data for the last 7 days (including today May 20)
// To show on the beautiful dashboard line chart
export const last7DaysRevenue = [
  { date: '14/05', amount: 8400000 },
  { date: '15/05', amount: 9200000 },
  { date: '16/05', amount: 7600000 },
  { date: '17/05', amount: 11000000 },
  { date: '18/05', amount: 10500000 },
  { date: '19/05', amount: 9800000 },
  { date: '20/05', amount: 12500000 }, // Today
];
