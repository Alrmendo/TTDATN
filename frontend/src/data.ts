import { Product, Employee, Customer, Invoice, Promotion, Store, PurchaseOrder } from './types';

export const initialProducts: Product[] = [];

export const initialInvoices: Invoice[] = [
  { invoiceId: 'HD001', staffId: 'NV002', staffName: 'Trần Thị B', customerName: 'Nguyễn Thị Hồng', customerId: 'KH001', totalAmount: 435000, date: '2026-05-20 10:15', storeName: 'Chi nhánh Quận 1', status: 'Hoàn thành', productsSummary: 'Mì Tôm Hảo Hảo (Thùng 30 gói) x1, Sữa TH True Milk x4', discountAmount: 45000 },
  { invoiceId: 'HD002', staffId: 'NV002', staffName: 'Trần Thị B', customerName: 'Phạm Thành Nam', customerId: 'KH002', totalAmount: 1150000, date: '2026-05-20 11:30', storeName: 'Chi nhánh Quận 1', status: 'Hoàn thành', productsSummary: 'Gạo ST25 Thượng Hạng (5kg) x4, Dầu ăn Simply 2L x2', discountAmount: 115000 },
  { invoiceId: 'HD003', staffId: 'NV004', staffName: 'Phạm Minh D', customerName: 'Trần Văn Tiến', customerId: 'KH003', totalAmount: 3200000, date: '2026-05-20 11:45', storeName: 'Chi nhánh Thảo Điền', status: 'Hoàn thành', productsSummary: 'Bia Heineken (Thùng 24 lon) x5, Đậu phộng sấy x10', discountAmount: 320000 },
  { invoiceId: 'HD004', staffId: 'NV006', staffName: 'Trịnh Quốc F', customerName: 'Khách vãng lai', totalAmount: 95000, date: '2026-05-20 12:00', storeName: 'Chi nhánh Bình Thạnh', status: 'Hoàn thành', productsSummary: 'Nước rửa chén Sunlight Chanh 3.6kg x1', discountAmount: 0 },
  { invoiceId: 'HD005', staffId: 'NV002', staffName: 'Trần Thị B', customerName: 'Lê Thu Thủy', customerId: 'KH004', totalAmount: 110000, date: '2026-05-20 13:10', storeName: 'Chi nhánh Quận 1', status: 'Đang xử lý', productsSummary: 'Sữa tươi tiệt trùng Vinamilk x10', discountAmount: 10000 },
  { invoiceId: 'HD006', staffId: 'NV004', staffName: 'Phạm Minh D', customerName: 'Vũ Minh Đức', customerId: 'KH005', totalAmount: 250000, date: '2026-05-19 15:30', storeName: 'Chi nhánh Thảo Điền', status: 'Hoàn thành', productsSummary: 'Dầu gội Clear thảo dược 650g x1', discountAmount: 25050 },
  { invoiceId: 'HD007', staffId: 'NV006', staffName: 'Trịnh Quốc F', customerName: 'Khách vãng lai', totalAmount: 125000, date: '2026-05-19 18:20', storeName: 'Chi nhánh Bình Thạnh', status: 'Đã hủy', productsSummary: 'Mì Tôm Hảo Hảo x10, Cocacola x6', discountAmount: 0 },
];

export const initialStores: Store[] = [
  { id: 'CH001', storeName: 'Chi nhánh Quận 1', address: '120 Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM', phone: '02838333333', managerName: 'Nguyễn Văn A' },
  { id: 'CH002', storeName: 'Chi nhánh Thảo Điền', address: '45 Thảo Điền, Quận 2, TP. HCM', phone: '02838444444', managerName: 'Trương Hoàng Hải' },
  { id: 'CH003', storeName: 'Chi nhánh Bình Thạnh', address: '19 Bùi Đình Túy, Quận Bình Thạnh, TP. HCM', phone: '02838555555', managerName: 'Bùi Thế Sơn' },
];