export interface Product {
  productId: string;
  productName: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  status?: 'Đang kinh doanh' | 'Ngừng kinh doanh';
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  storeId: string;
  status: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  loyaltyPoints: number;
  tier: 'Đồng' | 'Bạc' | 'Vàng' | 'Kim cương';
  totalSpent: number;
  email?: string;
  joinDate?: string;
}

export interface Invoice {
  invoiceId: string;
  staffId: string;
  staffName: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  date: string;
  storeName: string;
  status: 'Hoàn thành' | 'Đã hủy' | 'Đang xử lý';
  productsSummary?: string;
  discountAmount?: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: 'Phần trăm' | 'Giảm tiền mặt' | 'Đồng giá';
  value: number;
  startDate: string;
  endDate: string;
  status: string;
  minSpend?: number;
}

export interface Store {
  id: string;
  storeName: string;
  address: string;
  phone: string;
  managerName: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  quantity: number;
}

export interface PurchaseOrder {
  orderId: string;
  supplierName: string;
  storeId: string;
  storeName: string;
  status: 'Chờ xác nhận' | 'Đã nhập kho' | 'Đã hủy';
  totalCost: number;
  date: string;
}

export interface ApiAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'Manager' | 'Staff' | 'WarehouseStaff';
  storeId: string | null;
  salary: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiStore {
  id: string;
  storeName: string;
  address: string;
  phone: string | null;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'Manager' | 'Staff' | 'WarehouseStaff';
  storeId: string | null;
}

// ===== Inventory module (GET/PUT /api/inventory) =====

export interface ApiStockItem {
  id: string;
  storeId: string;
  productId: string;
  productName: string | null;
  sku: string | null;
  categoryName: string | null;
  price: number | null;
  costPrice: number | null;
  isActive: boolean | null;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: string;
}

export interface ApiLowStockItem {
  id: string;
  storeId: string;
  storeName: string | null;
  productId: string;
  productName: string | null;
  sku: string | null;
  quantity: number;
  lowStockThreshold: number;
}

// ===== Report module (GET /api/report/revenue, /api/report/inventory) =====

export interface ApiDailyRevenuePoint {
  date: string; // 'YYYY-MM-DD'
  amount: number;
}

export interface ApiTopProduct {
  productId: string;
  productName: string | null;
  sku: string | null;
  totalQuantity: number;
  totalRevenue: number;
}

export interface ApiRevenueReport {
  startDate: string;
  endDate: string;
  storeId: string | null;
  totalRevenue: number;
  totalDiscount: number;
  totalSubtotal: number;
  totalOrders: number;
  averageOrderValue: number;
  dailyRevenue: ApiDailyRevenuePoint[];
  topProducts: ApiTopProduct[];
}

export interface ApiInventoryReportItem {
  productId: string;
  productName: string | null;
  sku: string | null;
  storeId: string;
  storeName: string | null;
  quantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  stockValue: number;
}

export interface ApiInventoryReport {
  storeId: string | null;
  totalProducts: number;
  totalUnits: number;
  totalStockValue: number;
  lowStockCount: number;
  items: ApiInventoryReportItem[];
}
