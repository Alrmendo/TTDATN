// frontend/src/components/WarehouseManagementContainer.tsx
//
// CONTAINER cho WarehouseManagement.tsx (component UI giữ nguyên, không sửa).
//
// Phạm vi lần này: CHỈ wire tab "Tồn kho" với API thật
// (GET /api/inventory, GET /api/inventory/low-stock, PATCH /api/inventory).
//
// "Đơn nhập hàng" và "Điều chuyển hàng" CHƯA có backend (theo README §Pending
// Implementation: purchase_orders, stock_transfers chưa có model/API), nên
// purchaseOrders vẫn truyền rỗng và onAddNewPurchaseOrder/onConfirmPurchaseOrder
// tạm thời no-op + cảnh báo. Khi 2 module đó có API thật, thêm fetch tương tự
// rồi nối vào props của WarehouseManagement như cách làm dưới đây với inventory.
//
// LƯU Ý SHAPE LỆCH PHA:
// - Bảng `inventory` thật (Schema.md) dùng UUID + tách riêng theo storeId.
// - WarehouseManagement.tsx (UI) dùng Product.stock là 1 số duy nhất, không
//   theo storeId — vì UI này được thiết kế từ thời mock data (Product.stock).
// Container này merge dữ liệu inventory của ĐÚNG 1 storeId đang chọn vào
// field `stock` của từng Product để UI hiển thị đúng tồn kho theo chi nhánh.
// Nếu sau này UI cần xem nhiều chi nhánh cùng lúc, cần sửa lại WarehouseManagement.tsx
// để nhận thêm storeId theo dòng — ngoài phạm vi lần này.

import { useState, useEffect, useCallback } from 'react';
import WarehouseManagement from './WarehouseManagement';
import { Product, PurchaseOrder, Store } from '../types';

const API_BASE = '/api';

interface InventoryApiRow {
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: string;
}

interface WarehouseManagementContainerProps {
  /** Danh sách chi nhánh — Manager/Staff xem theo chi nhánh đang chọn ở nơi khác trong app */
  stores: Store[];
  /** Chi nhánh đang được chọn trong toàn app (ví dụ từ sidebar/topbar) */
  currentStoreId: string;
  /** Toàn bộ catalog sản phẩm (KHÔNG có stock) — ví dụ lấy từ GET /api/products khi đã migrate */
  productsCatalog: Omit<Product, 'stock'>[];
  activeTab: 'Tồn kho' | 'Đơn nhập hàng' | 'Điều chuyển hàng';
  authToken: string;
  userRole?: string;
}

export default function WarehouseManagementContainer({
  stores,
  currentStoreId,
  productsCatalog,
  activeTab,
  authToken,
  userRole,
}: WarehouseManagementContainerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  /**
   * Lấy tồn kho theo chi nhánh và merge vào danh sách sản phẩm dạng
   * Product[] mà WarehouseManagement.tsx (UI) đang cần (field `stock`).
   */
  const fetchInventory = useCallback(async () => {
    if (!currentStoreId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/inventory?storeId=${currentStoreId}`, {
        headers: authHeaders,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Không tải được tồn kho');

      const rows: InventoryApiRow[] = json.data || [];
      const stockByProductId = new Map(rows.map((r) => [r.productId, r.quantity]));

      const merged: Product[] = productsCatalog.map((p) => ({
        ...p,
        // Sản phẩm chưa có dòng inventory cho chi nhánh này -> coi như tồn 0
        stock: stockByProductId.get(p.productId) ?? 0,
      })) as Product[];

      setProducts(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  }, [currentStoreId, productsCatalog, authToken]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  /**
   * Khớp với signature SET cũ mà WarehouseManagement.tsx đang gọi:
   *   onAdjustStock(productId, newStock)
   *
   * Bên trong: tính delta so với tồn kho hiện tại, rồi gọi
   * InventoryService.updateInventory qua PATCH /api/inventory với
   * mode 'increase' | 'decrease' tương ứng — đúng theo Schema.md §5.
   */
  const handleAdjustStock = async (productId: string, newStock: number) => {
    const current = products.find((p) => p.productId === productId);
    if (!current) return;

    const delta = newStock - current.stock;
    if (delta === 0) return;

    const mode = delta > 0 ? 'increase' : 'decrease';
    const quantity = Math.abs(delta);

    // Cập nhật optimistic trên UI trước, rollback nếu API lỗi
    setProducts((prev) =>
      prev.map((p) => (p.productId === productId ? { ...p, stock: newStock } : p))
    );

    try {
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: currentStoreId,
          productId,
          quantity,
          mode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Cập nhật tồn kho thất bại');

      // Đồng bộ lại số chính xác từ server (tránh lệch nếu có giao dịch khác xen vào)
      setProducts((prev) =>
        prev.map((p) => (p.productId === productId ? { ...p, stock: json.data.quantity } : p))
      );
    } catch (err) {
      // Rollback về số cũ nếu API lỗi
      setProducts((prev) =>
        prev.map((p) => (p.productId === productId ? { ...p, stock: current.stock } : p))
      );
      setError(err instanceof Error ? err.message : 'Cập nhật tồn kho thất bại');
    }
  };

  // --- Đơn nhập hàng / Điều chuyển hàng: CHƯA có backend (xem README) ---
  // Để nguyên rỗng + no-op tạm thời, tránh người dùng tưởng đã lưu thật.
  const purchaseOrders: PurchaseOrder[] = [];

  const handleConfirmPurchaseOrder = (_orderId: string) => {
    console.warn(
      '[WarehouseManagementContainer] Xác nhận đơn nhập hàng: backend purchase_orders chưa được triển khai.'
    );
  };

  const handleAddNewPurchaseOrder = (_po: PurchaseOrder) => {
    console.warn(
      '[WarehouseManagementContainer] Tạo đơn nhập hàng: backend purchase_orders chưa được triển khai.'
    );
  };

  if (loading && products.length === 0) {
    return <div style={{ padding: 24, color: '#888' }}>Đang tải dữ liệu tồn kho...</div>;
  }

  return (
    <div>
      {error && (
        <div
          style={{
            background: '#FDECEC',
            border: '1px solid #F2A6A6',
            color: '#8A1F1F',
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 13,
            margin: '0 24px 12px',
          }}
        >
          {error}
        </div>
      )}
      <WarehouseManagement
        products={products}
        purchaseOrders={purchaseOrders}
        stores={stores}
        activeTab={activeTab}
        onAdjustStock={handleAdjustStock}
        onConfirmPurchaseOrder={handleConfirmPurchaseOrder}
        onAddNewPurchaseOrder={handleAddNewPurchaseOrder}
        userRole={userRole}
      />
    </div>
  );
}
