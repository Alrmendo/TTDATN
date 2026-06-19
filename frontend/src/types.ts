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

export interface ApiCustomer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  address: string | null;
  memberLevel: string | null;
  createdAt: string;
  loyaltyPoints?: { points: number };
}

export interface ApiPromotion {
  id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  productId: string | null;
  minOrderValue: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface ApiInvoiceDetail {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: { productName: string; sku: string };
}

export interface ApiInvoice {
  id: string;
  storeId: string;
  staffId: string;
  customerId: string | null;
  promotionId: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: 'pending' | 'success' | 'failed';
  paidAt: string | null;
  createdAt: string;
  invoiceDetails?: ApiInvoiceDetail[];
  customer?: ApiCustomer | null;
  staff?: { fullName: string };
  promotion?: ApiPromotion | null;
}

export interface ApiProduct {
  id: string;
  productName: string;
  sku: string;
  price: number;
  categoryId: string;
  isActive: boolean;
  category?: { categoryName: string };
}
