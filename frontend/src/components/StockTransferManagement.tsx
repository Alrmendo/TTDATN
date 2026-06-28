import { useState, useEffect, useCallback, FormEvent } from 'react';
import axios from 'axios';
import {
  ArrowLeftRight,
  Plus,
  X,
  Check,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  getTransfers,
  createTransfer,
  confirmTransfer,
  StockTransfer,
} from '../services/stock-transfer.service';

const API_URL = 'http://localhost:5000/api';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

interface ApiStore {
  id: string;
  storeName: string;
}

interface ApiProduct {
  id: string;
  productName: string;
  sku: string;
  isActive: boolean;
}

interface StockTransferManagementProps {
  userRole?: string;
}

export default function StockTransferManagement({
  userRole = 'Nhân viên kho',
}: StockTransferManagementProps) {
  const isManager = userRole === 'Quản lý' || userRole === 'Manager';
  const isWarehouseStaff =
    userRole === 'Nhân viên kho' || userRole === 'WarehouseStaff';

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'Tất cả' | 'pending' | 'completed'
  >('Tất cả');

  const [isCreating, setIsCreating] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(
    null
  );

  const [stores, setStores] = useState<ApiStore[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);

  const [fromStoreId, setFromStoreId] = useState('');
  const [toStoreId, setToStoreId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const [confirmLoadingId, setConfirmLoadingId] = useState('');

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params =
        statusFilter === 'Tất cả' ? undefined : { status: statusFilter };
      const data = await getTransfers(params);
      setTransfers(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi tải danh sách điều chuyển hàng');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  const openCreate = async () => {
    setIsCreating(true);
    setCreateError('');
    setFromStoreId('');
    setToStoreId('');
    setProductId('');
    setQuantity(1);
    try {
      const [storesRes, productsRes] = await Promise.all([
        axios.get(`${API_URL}/stores`, { headers: authHeader() }),
        axios.get(`${API_URL}/products`, { headers: authHeader() }),
      ]);
      setStores(storesRes.data);
      setProducts(productsRes.data.filter((p: ApiProduct) => p.isActive));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi tải dữ liệu chi nhánh/sản phẩm');
    }
  };

  const handleCreateTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromStoreId || !toStoreId) {
      setCreateError('Vui lòng chọn chi nhánh nguồn và chi nhánh nhận');
      return;
    }
    if (fromStoreId === toStoreId) {
      setCreateError('Chi nhánh nguồn và chi nhánh nhận không thể trùng nhau');
      return;
    }
    if (!productId) {
      setCreateError('Vui lòng chọn sản phẩm');
      return;
    }
    if (quantity < 1) {
      setCreateError('Số lượng phải lớn hơn 0');
      return;
    }
    setCreateLoading(true);
    setCreateError('');
    try {
      await createTransfer({ fromStoreId, toStoreId, productId, quantity });
      setIsCreating(false);
      loadTransfers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Tạo yêu cầu điều chuyển thất bại');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleConfirmTransfer = async (transferId: string) => {
    setConfirmLoadingId(transferId);
    try {
      await confirmTransfer(transferId);
      loadTransfers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Xác nhận nhận hàng thất bại');
    } finally {
      setConfirmLoadingId('');
    }
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight">
            Điều chuyển hàng giữa chi nhánh
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Luân chuyển nội bộ giữa hệ thống các chi nhánh đảm bảo cung ứng nhu cầu mua sắm.
          </p>
        </div>
      </div>

      {/* Top action bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-gray-500 font-bold whitespace-nowrap">Trạng thái:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-semibold"
          >
            <option value="Tất cả">Tất cả</option>
            <option value="pending">Chờ xác nhận</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>
        {isManager && (
          <div className="w-full md:w-auto text-right">
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition uppercase tracking-wider bg-[#3B82F6] hover:bg-blue-600 text-white cursor-pointer shadow-xs shadow-blue-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo yêu cầu điều chuyển</span>
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-black">Mã phiếu</th>
                <th className="py-3 px-4 font-black">Từ chi nhánh</th>
                <th className="py-3 px-4 font-black">Đến chi nhánh</th>
                <th className="py-3 px-4 font-black">Sản phẩm</th>
                <th className="py-3 px-4 font-black">Số lượng</th>
                <th className="py-3 px-4 font-black">Ngày tạo</th>
                <th className="py-3 px-4 font-black">Trạng thái</th>
                <th className="py-3 px-4 font-black text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-2 animate-spin" />
                    <p className="text-xs font-bold">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 bg-white text-center text-gray-400 font-bold">
                    <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2" />
                    <p className="text-xs font-bold text-gray-500">
                      Không tìm thấy phiếu điều chuyển hàng nào.
                    </p>
                  </td>
                </tr>
              ) : (
                transfers.map((tr) => {
                  const isPending = tr.status === 'pending';
                  return (
                    <tr key={tr.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-3.5 px-4 font-bold text-[#3B82F6] font-mono text-xs">
                        {tr.id.slice(0, 8)}…
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {tr.fromStore.storeName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {tr.toStore.storeName}
                      </td>
                      <td className="py-3.5 px-4 text-gray-650 font-bold">
                        {tr.product.productName}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-950 font-mono text-xs">
                        {tr.quantity} sp
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 font-mono">
                        {fmtDate(tr.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>
                            Chờ xác nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                            Hoàn thành
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isPending && isWarehouseStaff && (
                            <button
                              type="button"
                              disabled={confirmLoadingId === tr.id}
                              onClick={() => handleConfirmTransfer(tr.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-3xs flex items-center space-x-1 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Xác nhận nhận hàng</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedTransfer(tr)}
                            className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold transition"
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tạo yêu cầu điều chuyển */}
      {isCreating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                  Tạo yêu cầu điều chuyển
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">
                  Chuyển hàng từ một chi nhánh sang chi nhánh khác
                </p>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 text-xs font-medium">
                  {createError}
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Từ chi nhánh
                </label>
                <select
                  value={fromStoreId}
                  onChange={(e) => setFromStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-xs"
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.storeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Đến chi nhánh
                </label>
                <select
                  value={toStoreId}
                  onChange={(e) => setToStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-xs"
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {stores
                    .filter((s) => s.id !== fromStoreId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.storeName}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Sản phẩm
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 text-xs"
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Số lượng
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-black text-sm"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Chi tiết phiếu điều chuyển
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  Mã phiếu: <span className="font-mono font-bold text-gray-600">{selectedTransfer.id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Từ chi nhánh
                  </span>
                  <span className="font-extrabold text-gray-900 text-xs block">
                    {selectedTransfer.fromStore.storeName}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Đến chi nhánh
                  </span>
                  <span className="font-extrabold text-gray-900 text-xs block">
                    {selectedTransfer.toStore.storeName}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Sản phẩm
                  </span>
                  <span className="font-extrabold text-gray-900 text-xs block">
                    {selectedTransfer.product.productName}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono block">
                    {selectedTransfer.product.sku}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Số lượng
                  </span>
                  <span className="font-black text-gray-900 text-xs block font-mono">
                    {selectedTransfer.quantity} sp
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Trạng thái
                  </span>
                  <div className="mt-0.5">
                    {selectedTransfer.status === 'pending' ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>
                        Chờ xác nhận
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></span>
                        Hoàn thành
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Người tạo
                  </span>
                  <span className="font-semibold text-gray-800 text-xs block">
                    {selectedTransfer.creator.fullName}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                    Ngày tạo
                  </span>
                  <span className="font-semibold text-gray-800 text-xs block font-mono">
                    {fmtDate(selectedTransfer.createdAt)}
                  </span>
                </div>
                {selectedTransfer.confirmedAt && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      Ngày xác nhận
                    </span>
                    <span className="font-semibold text-gray-800 text-xs block font-mono">
                      {fmtDate(selectedTransfer.confirmedAt)}
                    </span>
                  </div>
                )}
                {selectedTransfer.confirmedBy && (
                  <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                    <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      Người xác nhận
                    </span>
                    <span className="font-semibold text-gray-800 text-xs block font-mono">
                      {selectedTransfer.confirmedBy}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedTransfer(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
