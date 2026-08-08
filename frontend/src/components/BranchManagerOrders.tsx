import { useEffect, useState, useCallback } from 'react';
import { Truck, RefreshCw, CheckCircle2, Loader2, PackageCheck } from 'lucide-react';
import { API_BASE } from '../config/api';

// Response shape verified against backend controllers/purchase-order.controller.ts —
// GET /api/purchase-orders và PUT /api/purchase-orders/:id/confirm-order đều trả object/array
// trần (không bọc trong { data: ... }), khác với /api/suppliers.
interface ApiOrderDetail {
  id: string;
  productId: string;
  quantity: number;
  receivedQuantity: number | null;
  unitCost: string;
  product: { id: string; productName: string; sku: string };
}

interface ApiPurchaseOrder {
  id: string;
  supplierId: string;
  storeId: string;
  status: 'pending' | 'ordered' | 'debt' | 'completed' | 'cancelled';
  totalCost: string | number;
  createdAt: string;
  confirmedAt: string | null;
  Supplier?: { id: string; supplierName: string; contactInfo: string | null };
  Store?: { id: string; storeName: string };
  creator?: { id: string; fullName: string };
  details?: ApiOrderDetail[];
}

const STATUS_BADGE: Record<ApiPurchaseOrder['status'], { label: string; className: string; dotClassName: string }> = {
  pending:   { label: 'Chờ xác nhận đặt hàng', className: 'bg-orange-100 text-orange-800 border-orange-200', dotClassName: 'bg-orange-600 animate-pulse' },
  ordered:   { label: 'Đã đặt hàng — chờ nhận', className: 'bg-blue-100 text-blue-800 border-blue-200', dotClassName: 'bg-blue-600' },
  debt:      { label: 'Còn nợ', className: 'bg-orange-100 text-orange-800 border-orange-200', dotClassName: 'bg-orange-600 animate-pulse' },
  completed: { label: 'Hoàn thành', className: 'bg-emerald-100 text-emerald-800 border-emerald-200', dotClassName: 'bg-emerald-600' },
  cancelled: { label: 'Đã hủy', className: 'bg-red-100 text-red-800 border-red-200', dotClassName: 'bg-red-600' },
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function BranchManagerOrders() {
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [notification, setNotification] = useState('');

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      // Không truyền storeId — backend tự ép store-scoping theo token BranchManager
      // (xem getPurchaseOrders trong purchase-order.controller.ts).
      const res = await fetch(`${API_BASE}/purchase-orders`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Không tải được danh sách đơn nhập hàng');
      setOrders(data as ApiPurchaseOrder[]);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Lỗi kết nối server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleConfirmOrdered = async (orderId: string) => {
    setConfirmingId(orderId);
    setActionError('');
    try {
      const res = await fetch(`${API_BASE}/purchase-orders/${orderId}/confirm-order`, {
        method: 'PUT',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        // 403 (chi nhánh khác) hoặc 409 (đơn không còn ở trạng thái pending) — hiện rõ, không im lặng.
        throw new Error(data?.message ?? 'Xác nhận đặt hàng thất bại');
      }
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'ordered' } : o)));
      triggerNotification('Đã xác nhận đặt hàng với nhà cung cấp!');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Lỗi không xác định');
      // Dữ liệu có thể đã lệch (vd. đơn vừa bị Manager huỷ) — tải lại để đồng bộ UI với server.
      fetchOrders();
    } finally {
      setConfirmingId(null);
    }
  };

  const formatVND = (num: number | string) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight">Đơn nhập hàng</h2>
          <p className="text-xs text-gray-500 mt-1">
            Xác nhận đã đặt hàng với nhà cung cấp cho đơn nhập hàng của chi nhánh bạn — bước bắt buộc trước khi Nhân viên kho xác nhận nhận hàng.
          </p>
        </div>
        {notification && (
          <div className="px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs font-medium">
          {fetchError}
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs font-medium">
          {actionError}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-black">Nhà cung cấp</th>
                <th className="py-3 px-4 font-black">Ngày tạo</th>
                <th className="py-3 px-4 font-black">Số mặt hàng</th>
                <th className="py-3 px-4 font-black">Tổng tiền</th>
                <th className="py-3 px-4 font-black">Trạng thái</th>
                <th className="py-3 px-4 font-black text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-2 animate-spin" />
                    <p className="text-xs font-bold">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 bg-white text-center text-gray-400 font-bold">
                    <Truck className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2" />
                    <p className="text-xs font-bold text-gray-500">Chưa có đơn nhập hàng nào cho chi nhánh của bạn.</p>
                  </td>
                </tr>
              ) : (
                orders.map((po) => {
                  const badge = STATUS_BADGE[po.status];
                  const canConfirmOrdered = po.status === 'pending';
                  return (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{po.Supplier?.supplierName ?? '—'}</td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono">{fmtDate(po.createdAt)}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-semibold">{po.details?.length ?? 0} sản phẩm</td>
                      <td className="py-3.5 px-4 font-bold text-gray-950 font-mono">{formatVND(po.totalCost)}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-2xs ${badge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${badge.dotClassName}`}></span>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canConfirmOrdered ? (
                          <button
                            type="button"
                            disabled={confirmingId === po.id}
                            onClick={() => handleConfirmOrdered(po.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-[11px] font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {confirmingId === po.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="w-3.5 h-3.5" />
                            )}
                            <span>Xác nhận đã đặt hàng</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-semibold">Không có thao tác</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
