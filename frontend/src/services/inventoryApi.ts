import { ApiStockItem, ApiLowStockItem } from '../types';

export type { ApiStockItem, ApiLowStockItem };

const API_BASE = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const authHeaders = (extra?: Record<string, string>) => ({
  Authorization: `Bearer ${getToken()}`,
  ...extra,
});

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Đã có lỗi xảy ra khi gọi API tồn kho');
  }
  return data;
}

/**
 * GET /api/inventory?storeId=
 * WarehouseStaff không cần truyền storeId (server tự ép theo chi nhánh của họ)
 * nhưng truyền vào vẫn an toàn — server sẽ bỏ qua nếu role là WarehouseStaff.
 */
export async function fetchStockByStore(storeId?: string): Promise<ApiStockItem[]> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetch(`${API_BASE}/inventory${qs}`, { headers: authHeaders() });
  return parseOrThrow(res);
}

/**
 * GET /api/inventory/low-stock?storeId=
 * storeId optional — bỏ trống để quét toàn hệ thống (Manager dashboard).
 */
export async function fetchLowStock(storeId?: string): Promise<ApiLowStockItem[]> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetch(`${API_BASE}/inventory/low-stock${qs}`, { headers: authHeaders() });
  return parseOrThrow(res);
}

/**
 * PUT /api/inventory/:productId  — đặt tồn kho về một số tuyệt đối.
 * Dùng cho nút "Cập nhật" / modal "Điều chỉnh số lượng kho".
 */
export async function setInventoryQuantity(
  productId: string,
  storeId: string,
  quantity: number
): Promise<ApiStockItem> {
  const res = await fetch(`${API_BASE}/inventory/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ storeId, quantity }),
  });
  return parseOrThrow(res);
}
