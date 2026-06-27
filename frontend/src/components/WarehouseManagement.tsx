import { useState, FormEvent, useEffect, useCallback } from 'react';
import { Product, PurchaseOrder, Store } from '../types';
import { 
  Boxes, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Search, 
  Edit, 
  RefreshCw, 
  ArrowLeftRight, 
  X, 
  Plus, 
  TrendingUp, 
  Check, 
  ShoppingBag, 
  Truck,
  Building,
  Calendar,
  Loader2
} from 'lucide-react';

// ─── API helpers ──────────────────────────────────────────────────────────────

const API = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── API Types ────────────────────────────────────────────────────────────────

interface ApiSupplier {
  id: string;
  supplierName: string;
  contactInfo: string | null;
}

interface ApiStore {
  id: string;
  storeName: string;
}

interface ApiProduct {
  id: string;
  productName: string;
  sku: string;
  costPrice: string | null;
}

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
  status: 'pending' | 'completed' | 'cancelled';
  totalCost: string;
  createdBy: string;
  confirmedBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
  Supplier?: ApiSupplier;
  Store?: { id: string; storeName: string };
  creator?: { id: string; fullName: string };
  confirmer?: { id: string; fullName: string } | null;
  details?: ApiOrderDetail[];
}

interface ReceivedItem {
  productId: string;
  receivedQuantity: number;
}

// ─── Original component props ─────────────────────────────────────────────────

interface WarehouseManagementProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  stores: Store[];
  activeTab: 'Tồn kho' | 'Đơn nhập hàng' | 'Điều chuyển hàng';
  onAdjustStock: (productId: string, newStock: number) => void;
  onConfirmPurchaseOrder: (orderId: string) => void;
  onAddNewPurchaseOrder?: (po: PurchaseOrder) => void;
  userRole?: string;
}

export default function WarehouseManagement({
  products,
  purchaseOrders,
  stores,
  activeTab,
  onAdjustStock,
  onConfirmPurchaseOrder,
  onAddNewPurchaseOrder,
  userRole = 'Nhân viên kho'
}: WarehouseManagementProps) {
  
  // Search & Filter state for Tồn kho
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Modal active states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newStockVal, setNewStockVal] = useState(0);

  // Stock Transfer state
  const [transferSource, setTransferSource] = useState('CH001');
  const [transferDest, setTransferDest] = useState('CH002');
  const [transferProduct, setTransferProduct] = useState(products[0]?.productId || '');
  const [transferQty, setTransferQty] = useState(5);
  const [transfers, setTransfers] = useState([
    { id: 'DC001', from: 'Chi nhánh Quận 1', to: 'Chi nhánh Thảo Điền', product: 'Gạo ST25 Thượng Hạng (5kg)', qty: 10, date: '2026-05-18', status: 'Hoàn thành' },
    { id: 'DC002', from: 'Chi nhánh Thảo Điền', to: 'Chi nhánh Bình Thạnh', product: 'Mì Tôm Hảo Hảo Chua Cay (Thùng 30 gói)', qty: 15, date: '2026-05-19', status: 'Chờ xác nhận' },
    { id: 'DC003', from: 'Chi nhánh Bình Thạnh', to: 'Chi nhánh Quận 1', product: 'Sữa tươi tiệt trùng Vinamilk 180ml', qty: 25, date: '2026-05-20', status: 'Chờ xác nhận' },
    { id: 'DC004', from: 'Chi nhánh Quận 1', to: 'Chi nhánh Bình Thạnh', product: 'Nước rửa chén Sunlight Chanh 3.6kg', qty: 8, date: '2026-05-20', status: 'Hoàn thành' },
  ]);

  const [transferStatusFilter, setTransferStatusFilter] = useState<'Tất cả' | 'Chờ xác nhận' | 'Hoàn thành'>('Tất cả');
  const [transferCurrentPage, setTransferCurrentPage] = useState(1);
  const transferItemsPerPage = 5;
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);

  // Toast / Notification status
  const [notification, setNotification] = useState<string | null>(null);

  // ─── Đơn nhập hàng — API state ──────────────────────────────────────────────
  const isManager = userRole === 'Quản lý';
  const isWarehouseStaff = userRole === 'Nhân viên kho' || userRole === 'WarehouseStaff';

  const [apiOrders, setApiOrders] = useState<ApiPurchaseOrder[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Filter / pagination
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState<'Tất cả' | 'Chờ xác nhận' | 'Hoàn thành' | 'Đã hủy'>('Tất cả');
  const [poCurrentPage, setPoCurrentPage] = useState(1);
  const poItemsPerPage = 5;

  // Detail modal
  const [selectedPO, setSelectedPO] = useState<ApiPurchaseOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Create PO modal (Manager)
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [apiSuppliers, setApiSuppliers] = useState<ApiSupplier[]>([]);
  const [apiStores, setApiStores] = useState<ApiStore[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState('');
  const [newStoreId, setNewStoreId] = useState('');
  const [cart, setCart] = useState<{ productId: string; productName: string; sku: string; quantity: number; unitCost: number }[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ApiProduct[]>([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // status map API → UI
  const STATUS_MAP: Record<string, string> = {
    pending: 'Chờ xác nhận',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy',
  };
  const STATUS_MAP_REVERSE: Record<string, string> = {
    'Chờ xác nhận': 'pending',
    'Hoàn thành': 'completed',
    'Đã hủy': 'cancelled',
    'Tất cả': '',
  };

  // ─── Fetch orders ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (activeTab !== 'Đơn nhập hàng') return;
    setApiLoading(true);
    setApiError('');
    try {
      const params = new URLSearchParams();
      const apiStatus = STATUS_MAP_REVERSE[poStatusFilter];
      if (apiStatus) params.set('status', apiStatus);
      if (poSearch.trim()) params.set('search', poSearch.trim());
      const res = await fetch(`${API}/api/purchase-orders?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).message ?? 'Lỗi tải dữ liệu');
      setApiOrders(await res.json());
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Lỗi kết nối server');
    } finally {
      setApiLoading(false);
    }
  }, [activeTab, poStatusFilter, poSearch]);

  useEffect(() => { fetchOrders(); fetchSuppliers(); }, [fetchOrders]);

  useEffect(() => { setPoCurrentPage(1); }, [poSearch, poStatusFilter]);

  // ─── Fetch stores (Manager) ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isManager) return;
    fetch(`${API}/api/stores`, { headers: authHeaders() })
      .then(r => r.json()).then(setApiStores).catch(() => {});
  }, [isManager]);

  // ─── Product search (create modal) ──────────────────────────────────────────
  useEffect(() => {
    if (!productSearch.trim()) { setProductResults([]); return; }
    const t = setTimeout(async () => {
      setProductSearchLoading(true);
      try {
        const res = await fetch(`${API}/api/products/search?q=${encodeURIComponent(productSearch)}`, { headers: authHeaders() });
        if (res.ok) setProductResults(await res.json());
      } finally { setProductSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  // ─── Open detail modal ───────────────────────────────────────────────────────
  const openDetail = async (order: ApiPurchaseOrder) => {
    setSelectedPO(order);
    setConfirmError('');
    setDetailLoading(true);
    try {
      const res = await fetch(`${API}/api/purchase-orders/${order.id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error();
      const full: ApiPurchaseOrder = await res.json();
      setSelectedPO(full);
      setReceivedItems(
        (full.details ?? []).map(d => ({
          productId: d.productId,
          receivedQuantity: d.receivedQuantity ?? d.quantity,
        }))
      );
    } catch {
      setConfirmError('Không tải được chi tiết đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedPO(null);
    setReceivedItems([]);
    setConfirmError('');
  };

  // ─── Confirm receipt ─────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedPO) return;
    setConfirmLoading(true);
    setConfirmError('');
    try {
      const res = await fetch(`${API}/api/purchase-orders/${selectedPO.id}/confirm`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ receivedItems }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Xác nhận thất bại');
      }
      closeDetail();
      triggerNotification('Đã xác nhận nhận hàng và cập nhật tồn kho thành công!');
      fetchOrders();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ─── Cancel order (Manager) ──────────────────────────────────────────────────
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Xác nhận huỷ đơn nhập hàng này?')) return;
    try {
      const res = await fetch(`${API}/api/purchase-orders/${orderId}/cancel`, {
        method: 'PUT', headers: authHeaders(),
      });
      if (!res.ok) { alert((await res.json()).message ?? 'Huỷ đơn thất bại'); return; }
      triggerNotification('Đã huỷ đơn nhập hàng thành công!');
      fetchOrders();
    } catch { alert('Lỗi kết nối server'); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(
        `${API}/api/suppliers`,
        {
          headers: authHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error('Không tải được danh sách nhà cung cấp');
      }

      const data = await res.json();

      setSuppliers(data.data ?? []);
    } catch (err) {
      console.error(err);
    }
  };
  
  // ─── Open create modal ───────────────────────────────────────────────────────
  const openCreate = async () => {
    setIsCreatingPO(true);
    setCart([]);
    setNewSupplierId('');
    setNewStoreId('');
    setCreateError('');
    setSuppliersLoading(true);
    try {
      const res = await fetch(`${API}/api/suppliers`, { headers: authHeaders() });
      if (res.ok) setApiSuppliers(await res.json());
    } catch {} finally { setSuppliersLoading(false); }
  };

  // ─── Submit create order ─────────────────────────────────────────────────────
  const handleCreatePO = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSupplierId) { setCreateError('Chọn nhà cung cấp'); return; }
    if (!newStoreId) { setCreateError('Chọn chi nhánh'); return; }
    if (cart.length === 0) { setCreateError('Thêm ít nhất 1 sản phẩm'); return; }
    setCreateLoading(true);
    setCreateError('');
    try {
      const res = await fetch(`${API}/api/purchase-orders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          supplierId: newSupplierId,
          storeId: newStoreId,
          items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, unitCost: c.unitCost })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Tạo đơn thất bại'); }
      setIsCreatingPO(false);
      setCart([]);
      triggerNotification('Đã tạo đơn nhập hàng thành công!');
      fetchOrders();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally { setCreateLoading(false); }
  };

  // ─── Cart helpers ────────────────────────────────────────────────────────────
  const addToCart = (p: ApiProduct) => {
    setCart(prev => prev.find(c => c.productId === p.id) ? prev : [
      ...prev,
      { productId: p.id, productName: p.productName, sku: p.sku, quantity: 1, unitCost: p.costPrice ? parseFloat(p.costPrice) : 0 }
    ]);
    setProductSearch(''); setProductResults([]);
  };

  // ─── Original helpers ─────────────────────────────────────────────────────────

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const formatVND = (num: number | string) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  // Tồn kho helpers
  const totalDistinctProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock < 10);
  const lowStockCount = lowStockProducts.length;
  const pendingOrdersCount = apiOrders.filter(o => o.status === 'pending').length;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.productId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoriesList = Array.from(new Set(products.map(p => p.category)));

  const handleSaveStockAdjustment = (e: FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    onAdjustStock(editingProduct.productId, newStockVal);
    setEditingProduct(null);
    triggerNotification(`Đã cập nhật số lượng tồn kho sản phẩm ${editingProduct.productName} thành công!`);
  };

  const handleOpenEditStock = (p: Product) => {
    setEditingProduct(p);
    setNewStockVal(p.stock);
  };

  // Transfer helpers
  const handleCreateTransfer = (e: FormEvent) => {
    e.preventDefault();
    if (transferSource === transferDest) { alert('Chi nhánh nguồn và chi nhánh nhận hàng không thể trùng nhau!'); return; }
    const prodObj = products.find(p => p.productId === transferProduct);
    if (!prodObj) return;
    if (prodObj.stock < transferQty) { alert(`Số lượng sản phẩm trong kho không đủ! Chỉ còn lại ${prodObj.stock} sp.`); return; }
    onAdjustStock(prodObj.productId, prodObj.stock - transferQty);
    const newTransfer = {
      id: `DC${String(transfers.length + 1).padStart(3, '0')}`,
      from: stores.find(s => s.id === transferSource)?.storeName || 'Chi nhánh Quận 1',
      to: stores.find(s => s.id === transferDest)?.storeName || 'Chi nhánh Thảo Điền',
      product: prodObj.productName,
      qty: transferQty,
      date: '2026-05-20',
      status: 'Chờ xác nhận'
    };
    setTransfers([newTransfer, ...transfers]);
    setIsCreatingTransfer(false);
    triggerNotification(`Đã tạo yêu cầu điều chuyển ${transferQty} sp '${prodObj.productName}' sang ${newTransfer.to}!`);
  };

  const handleConfirmTransfer = (id: string) => {
    const idx = transfers.findIndex(t => t.id === id);
    if (idx > -1) {
      const updated = [...transfers];
      updated[idx] = { ...updated[idx], status: 'Hoàn thành' };
      setTransfers(updated);
      triggerNotification(`Đã xác nhận nhận hàng cho phiếu điều chuyển ${id}!`);
    }
  };

  // ─── Computed filtered PO list ───────────────────────────────────────────────
  const filteredPOList = apiOrders;

  const totalPOItems = filteredPOList.length;
  const totalPOPages = Math.ceil(totalPOItems / poItemsPerPage) || 1;
  const indexOfLastPOItem = poCurrentPage * poItemsPerPage;
  const indexOfFirstPOItem = indexOfLastPOItem - poItemsPerPage;
  const currentPOItems = filteredPOList.slice(indexOfFirstPOItem, indexOfLastPOItem);

  // Transfer pagination
  const filteredTransfers = transfers.filter(tr =>
    transferStatusFilter === 'Tất cả' || tr.status === transferStatusFilter
  );
  const totalTrItems = filteredTransfers.length;
  const totalTrPages = Math.ceil(totalTrItems / transferItemsPerPage) || 1;
  const indexOfLastTrItem = transferCurrentPage * transferItemsPerPage;
  const indexOfFirstTrItem = indexOfLastTrItem - transferItemsPerPage;
  const currentTransfersList = filteredTransfers.slice(indexOfFirstTrItem, indexOfLastTrItem);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Title block & Toast notifier */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="warehouse-page-title">
            {activeTab === 'Tồn kho' && "Quản lý tồn kho"}
            {activeTab === 'Đơn nhập hàng' && "Quản lý đơn nhập hàng"}
            {activeTab === 'Điều chuyển hàng' && "Yêu cầu điều chuyển chi nhánh"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === 'Tồn kho' && "Theo dõi mức độ dữ trữ, thông tin định mức kiểm kê và cảnh báo hết hàng tự động."}
            {activeTab === 'Đơn nhập hàng' && "Quá trình giao nhận lô hàng mua lẻ từ nhà cung cấp liên kết ngoài vào sổ lưu trữ."}
            {activeTab === 'Điều chuyển hàng' && "Luân chuyển nội bộ giữa hệ thống các siêu thị đảm bảo cung ứng nhu cầu mua sắm."}
          </p>
        </div>
        {notification && (
          <div className="px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* ================= VIEW 1: TỒN KHO ================= */}
      {activeTab === 'Tồn kho' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="warehouse-overview-cards">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl"><Boxes className="w-5 h-5" /></div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng sản phẩm kinh doanh</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{totalDistinctProducts} danh mục SKU</span>
                <span className="text-[10px] text-gray-400 font-medium mt-1 block">Tập trung chủ yếu thực phẩm khô & tiêu dùng</span>
              </div>
            </div>
            <div className={`p-5 rounded-xl border flex items-center space-x-4 shadow-xs transition ${lowStockCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-white border-gray-200'}`}>
              <div className={`p-3 rounded-xl ${lowStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-orange-50 text-orange-600'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Sản phẩm sắp hết ({'< 10'})</span>
                <span className={`text-base font-black font-mono mt-0.5 block ${lowStockCount > 0 ? 'text-red-600 font-black animate-pulse' : 'text-gray-950'}`}>
                  {lowStockCount} SKU cần gom hàng
                </span>
                <span className="text-[10px] text-gray-400 font-medium mt-1 block">Ngưỡng cảnh báo dưới định mức 10 sp</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><FileText className="w-5 h-5" /></div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Đơn mua hàng chờ duyệt</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{pendingOrdersCount} lô hàng</span>
                <span className="text-[10px] text-amber-600 font-bold mt-1 block">Xác nhận nhập kho để cộng trừ số tồn</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-6 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Tìm mã hoặc tên mặt hàng để kiểm kê nhanh..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-3">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white text-gray-900 focus:outline-none">
                <option value="Tất cả">Tất cả ngành hàng</option>
                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="md:col-span-3 text-right">
              <span className="text-xs font-bold text-gray-500">
                Hiển thị <span className="text-[#3B82F6] font-mono font-black">{filteredProducts.length}</span> sản phẩm
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3.5">Mã SP</th>
                    <th className="px-5 py-3.5">Tên sản phẩm</th>
                    <th className="px-5 py-3.5">Danh mục sản phẩm</th>
                    <th className="px-5 py-3.5 text-center">Tồn kho thực tế</th>
                    <th className="px-5 py-3.5 text-center">Ngưỡng cảnh báo</th>
                    <th className="px-5 py-3.5 text-center">Trạng thái định mức</th>
                    <th className="px-5 py-3.5 text-right w-32">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/40 font-medium text-gray-700">
                  {filteredProducts.map(p => {
                    const isOutOfStock = p.stock === 0;
                    const isLowStock = p.stock > 0 && p.stock < 10;
                    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    let statusLabel = "Đủ hàng";
                    if (isOutOfStock) { badgeClass = "bg-red-50 text-red-700 border-red-150"; statusLabel = "Hết hàng"; }
                    else if (isLowStock) { badgeClass = "bg-amber-50 text-amber-700 border-amber-200"; statusLabel = "Sắp hết"; }
                    return (
                      <tr key={p.productId} className={`hover:bg-gray-50/40 transition-colors ${isLowStock ? 'bg-amber-50/20' : isOutOfStock ? 'bg-red-50/10' : ''}`}>
                        <td className="px-5 py-3.5 font-bold font-mono text-gray-950 text-xs">{p.productId}</td>
                        <td className="px-5 py-3.5 text-gray-950 font-bold text-xs">{p.productName}</td>
                        <td className="px-5 py-3.5 text-gray-500 font-semibold">{p.category}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-mono text-sm font-black px-2 py-0.5 rounded ${isOutOfStock ? 'text-red-700 bg-red-100 font-extrabold' : isLowStock ? 'text-amber-700 bg-amber-100 font-extrabold' : 'text-gray-900'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono text-gray-400">10 sp</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex px-3 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${badgeClass}`}>{statusLabel}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button onClick={() => handleOpenEditStock(p)}
                            className="px-2.5 py-1 text-[10px] font-bold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] rounded bg-white text-gray-700 transition flex items-center justify-center space-x-1">
                            <Edit className="w-3 h-3" /><span>Cập nhật</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400">
                        <Boxes className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-bounce" />
                        <p className="text-xs font-bold">Không tìm thấy sản phẩm cần kiểm kê nào!</p>
                        <p className="text-[10px] text-gray-400 mt-1">Sử dụng từ khóa khác hoặc dọn bộ lọc ngành hàng</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: ĐƠN NHẬP HÀNG (API) ================= */}
      {activeTab === 'Đơn nhập hàng' && (
        <div className="space-y-6 animate-fadeIn text-xs">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-200 gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-950 font-sans tracking-tight">Đơn nhập hàng</h2>
              <p className="text-xs text-gray-400 mt-1">Quản lý và ký nhận các lô hàng vận chuyển từ các nhà phân phối và nhà cung cấp đối tác.</p>
            </div>
          </div>

          {/* API Error */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs font-medium">{apiError}</div>
          )}

          {/* Top Action Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={poSearch}
                  onChange={(e) => setPoSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchOrders(); }}
                  placeholder="Tìm theo mã đơn hoặc nhà cung cấp"
                  className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-gray-50/50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs"
                />
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-gray-500 font-bold whitespace-nowrap">Trạng thái:</span>
                <select value={poStatusFilter} onChange={(e) => setPoStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-semibold">
                  <option value="Tất cả">Tất cả</option>
                  <option value="Chờ xác nhận">Chờ xác nhận</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Đã hủy">Đã hủy</option>
                </select>
              </div>
            </div>
            <div className="w-full md:w-auto text-right">
              <button
                type="button"
                disabled={!isManager}
                onClick={openCreate}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition uppercase tracking-wider ${isManager ? 'bg-[#3B82F6] hover:bg-blue-600 text-white cursor-pointer shadow-xs shadow-blue-500/10' : 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                title={!isManager ? 'Chỉ Quản lý mới có quyền tạo đơn nhập hàng mới' : 'Tạo đơn nhập hàng mới'}
              >
                <Plus className="w-4 h-4" />
                <span>Tạo đơn nhập hàng</span>
                {!isManager && <span className="text-[9px] font-normal lowercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1">Quản lý</span>}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-black">Mã đơn</th>
                    <th className="py-3 px-4 font-black">Nhà cung cấp</th>
                    <th className="py-3 px-4 font-black">Chi nhánh</th>
                    <th className="py-3 px-4 font-black">Ngày tạo</th>
                    <th className="py-3 px-4 font-black">Tổng tiền</th>
                    <th className="py-3 px-4 font-black">Trạng thái</th>
                    <th className="py-3 px-4 font-black text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {apiLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-2 animate-spin" />
                        <p className="text-xs font-bold">Đang tải dữ liệu...</p>
                      </td>
                    </tr>
                  ) : currentPOItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 bg-white text-center text-gray-400 font-bold">
                        <Truck className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2" />
                        <p className="text-xs font-bold text-gray-500">Không tìm thấy yêu cầu nhập hàng nào.</p>
                        <p className="text-[10px] text-gray-400 font-normal mt-1">Điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để kiểm định lại.</p>
                      </td>
                    </tr>
                  ) : currentPOItems.map((po) => {
                    const statusLabel = STATUS_MAP[po.status] ?? po.status;
                    const isPending = po.status === 'pending';
                    const isCompleted = po.status === 'completed';
                    const isCancelled = po.status === 'cancelled';
                    return (
                      <tr key={po.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-[#3B82F6] font-mono text-xs">
                          {po.id.slice(0, 8)}…
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900">{po.Supplier?.supplierName ?? '—'}</td>
                        <td className="py-3.5 px-4 text-gray-600 font-semibold">{po.Store?.storeName ?? '—'}</td>
                        <td className="py-3.5 px-4 text-gray-500 font-mono">{fmtDate(po.createdAt)}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-950 font-mono">{formatVND(po.totalCost)}</td>
                        <td className="py-3.5 px-4">
                          {isPending && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>Chờ xác nhận
                            </span>
                          )}
                          {isCompleted && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>Hoàn thành
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></span>Đã hủy
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {/* Nút Xem chi tiết — duy nhất trong cột Hành động */}
                            <button
                              type="button"
                              onClick={() => openDetail(po)}
                              className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold transition"
                            >
                              Xem chi tiết
                            </button>
                            {/* Manager: nút huỷ đơn pending */}
                            {isManager && isPending && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(po.id)}
                                className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-[11px] font-bold transition"
                              >
                                Huỷ đơn
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPOItems > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3.5 flex items-center justify-between">
                <div className="text-gray-500 font-semibold text-[11px]">
                  Hiển thị <span className="font-bold text-gray-900">{indexOfFirstPOItem + 1}</span> - <span className="font-bold text-gray-900">{Math.min(indexOfLastPOItem, totalPOItems)}</span> trong số <span className="font-bold text-gray-900">{totalPOItems}</span> đơn nhập hàng
                </div>
                <div className="flex items-center space-x-1.5">
                  <button type="button" disabled={poCurrentPage === 1} onClick={() => setPoCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition text-[11px] cursor-pointer disabled:cursor-not-allowed">
                    Quay lại
                  </button>
                  {Array.from({ length: totalPOPages }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" onClick={() => setPoCurrentPage(n)}
                      className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-lg transition ${poCurrentPage === n ? 'bg-[#3B82F6] text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                      {n}
                    </button>
                  ))}
                  <button type="button" disabled={poCurrentPage === totalPOPages} onClick={() => setPoCurrentPage(p => Math.min(totalPOPages, p + 1))}
                    className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition text-[11px] cursor-pointer disabled:cursor-not-allowed">
                    Tiếp theo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 3: ĐIỀU CHUYỂN HÀNG ================= */}
      {activeTab === 'Điều chuyển hàng' && (
        <div className="space-y-6 animate-fadeIn text-xs">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-200 gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-sans tracking-tight">Điều chuyển hàng giữa chi nhánh</h2>
              <p className="text-xs text-gray-400 mt-1">Quản lý, cấp lệnh và ký nhận vận chuyển hàng hóa nội bộ giữa các chi nhánh siêu thị.</p>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-gray-500 font-bold whitespace-nowrap">Trạng thái:</span>
              <select value={transferStatusFilter} onChange={(e) => setTransferStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-semibold">
                <option value="Tất cả">Tất cả</option>
                <option value="Chờ xác nhận">Chờ xác nhận</option>
                <option value="Hoàn thành">Hoàn thành</option>
              </select>
            </div>
            <div className="w-full md:w-auto text-right">
              <button type="button" disabled={!isManager} onClick={() => setIsCreatingTransfer(true)}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition uppercase tracking-wider ${isManager ? 'bg-[#3B82F6] hover:bg-blue-600 text-white cursor-pointer shadow-xs shadow-blue-500/10' : 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200'}`}>
                <ArrowLeftRight className="w-4 h-4" />
                <span>Tạo yêu cầu điều chuyển</span>
                {!isManager && <span className="text-[9px] font-normal lowercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1">Quản lý</span>}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
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
                  {currentTransfersList.map((tr) => {
                    const isPending = tr.status === 'Chờ xác nhận';
                    return (
                      <tr key={tr.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-[#3B82F6] font-mono text-xs">{tr.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{tr.from}</td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">{tr.to}</td>
                        <td className="py-3.5 px-4 text-gray-650 font-bold">{tr.product}</td>
                        <td className="py-3.5 px-4 font-bold text-gray-950 font-mono text-xs">{tr.qty} sp</td>
                        <td className="py-3.5 px-4 text-gray-500 font-mono">{tr.date}</td>
                        <td className="py-3.5 px-4">
                          {isPending ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-850 border border-orange-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>Chờ xác nhận
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-850 border border-emerald-250 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-650 mr-1.5"></span>Hoàn thành
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            {isPending && (
                              <button type="button" onClick={() => handleConfirmTransfer(tr.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-3xs flex items-center space-x-1">
                                <Check className="w-3.5 h-3.5" /><span>Xác nhận nhận hàng</span>
                              </button>
                            )}
                            <button type="button" onClick={() => setSelectedTransfer(tr)}
                              className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold transition">
                              Xem chi tiết
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {currentTransfersList.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 bg-white text-center text-gray-400 font-bold">
                        <ArrowLeftRight className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2 animate-pulse" />
                        <p className="text-xs font-bold text-gray-500">Không tìm thấy phiếu điều chuyển hàng nào.</p>
                        <p className="text-[10px] text-gray-400 font-normal mt-1">Kiểm định lại bộ lọc trạng thái để rà soát chứng từ lỗi.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalTrItems > 0 && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3.5 flex items-center justify-between">
                <div className="text-gray-500 font-semibold text-[11px]">
                  Hiển thị <span className="font-bold text-gray-900">{indexOfFirstTrItem + 1}</span> - <span className="font-bold text-gray-900">{Math.min(indexOfLastTrItem, totalTrItems)}</span> trong số <span className="font-bold text-gray-900">{totalTrItems}</span> vận đơn chuyển
                </div>
                <div className="flex items-center space-x-1.5">
                  <button type="button" disabled={transferCurrentPage === 1} onClick={() => setTransferCurrentPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition text-[11px] cursor-pointer disabled:cursor-not-allowed">Quay lại</button>
                  {Array.from({ length: totalTrPages }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button" onClick={() => setTransferCurrentPage(n)}
                      className={`w-7 h-7 flex items-center justify-center font-bold text-xs rounded-lg transition ${transferCurrentPage === n ? 'bg-[#3B82F6] text-white' : 'border border-gray-300 text-gray-750 hover:bg-gray-50'}`}>{n}</button>
                  ))}
                  <button type="button" disabled={transferCurrentPage === totalTrPages} onClick={() => setTransferCurrentPage(p => Math.min(totalTrPages, p + 1))}
                    className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition text-[11px] cursor-pointer disabled:cursor-not-allowed">Tiếp theo</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CẬP NHẬT TỒN KHO ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Điều chỉnh số lượng kho</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cập nhật khẩn cấp tồn kho cho sản phẩm này</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveStockAdjustment} className="p-5 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Sản phẩm điều chỉnh</span>
                <span className="font-bold text-gray-900 text-xs block">{editingProduct.productName}</span>
                <span className="text-[10px] text-gray-400 font-mono block">Mã: {editingProduct.productId} &bull; Ngành: {editingProduct.category}</span>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số lượng lưu kho mới</label>
                <input type="number" min="0" required value={newStockVal} onChange={(e) => setNewStockVal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-black text-sm" />
                <p className="text-[10px] text-gray-400 font-medium">Báo cáo sẽ tự động ghi dấu theo số tồn kho mới này sau phân tích.</p>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setEditingProduct(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition">Hủy bỏ</button>
                <button type="submit" className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHI TIẾT ĐƠN NHẬP HÀNG (API) ================= */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">

            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Chi tiết chứng từ đơn nhập hàng
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                  Mã đơn hệ thống: <span className="font-mono font-bold text-gray-600">{selectedPO.id.slice(0, 8)}…</span>
                </p>
              </div>
              <button onClick={closeDetail} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"><X className="w-4 h-4" /></button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {detailLoading ? (
                <div className="py-10 text-center text-gray-400">
                  <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-gray-300" />
                  <p className="text-xs font-bold">Đang tải chi tiết...</p>
                </div>
              ) : (
                <>
                  {/* Meta info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nhà cung cấp</span>
                      <span className="font-extrabold text-gray-900 text-xs block">{selectedPO.Supplier?.supplierName ?? '—'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Chi nhánh nhận</span>
                      <span className="font-extrabold text-gray-900 text-xs block">{selectedPO.Store?.storeName ?? '—'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ngày tạo</span>
                      <span className="font-semibold text-gray-800 text-xs block font-mono">{fmtDate(selectedPO.createdAt)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tổng giá trị</span>
                      <span className="font-black text-[#10B981] text-xs block font-mono">{formatVND(selectedPO.totalCost)}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Người tạo</span>
                      <span className="font-semibold text-gray-800 text-xs block">{selectedPO.creator?.fullName ?? '—'}</span>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Trạng thái</span>
                      <div className="mt-0.5">
                        {selectedPO.status === 'pending' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>Chờ xác nhận
                          </span>
                        )}
                        {selectedPO.status === 'completed' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5"></span>Hoàn thành
                          </span>
                        )}
                        {selectedPO.status === 'cancelled' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></span>Đã hủy
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Danh sách sản phẩm trong đơn ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-black text-gray-900 uppercase tracking-wide text-[10px]">Danh mục sản phẩm trong đơn</h4>
                      {selectedPO.status === 'pending' && isWarehouseStaff && (
                        <span className="text-[9px] text-blue-500 font-semibold">Chỉnh SL thực nhận nếu khác đơn</span>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px]">Sản phẩm</th>
                            <th className="px-3 py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] text-right">Đơn giá</th>
                            <th className="px-3 py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] text-right">SL đặt</th>
                            <th className="px-3 py-2.5 font-black text-gray-500 uppercase tracking-wider text-[9px] text-right">
                              {selectedPO.status === 'pending' && isWarehouseStaff ? 'SL thực nhận' : 'SL đã nhận'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(selectedPO.details ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-[10px]">Không có dữ liệu chi tiết</td>
                            </tr>
                          ) : (selectedPO.details ?? []).map(detail => {
                            const receivedItem = receivedItems.find(r => r.productId === detail.productId);
                            return (
                              <tr key={detail.id} className="hover:bg-gray-50/50">
                                <td className="px-3 py-2.5">
                                  <p className="font-bold text-gray-900">{detail.product?.productName ?? '—'}</p>
                                  <p className="text-[9px] text-gray-400 font-mono mt-0.5">{detail.product?.sku}</p>
                                </td>
                                <td className="px-3 py-2.5 text-right font-mono text-gray-600">{formatVND(detail.unitCost)}</td>
                                <td className="px-3 py-2.5 text-right font-bold font-mono text-gray-800">{detail.quantity}</td>
                                <td className="px-3 py-2.5 text-right">
                                  {/* WarehouseStaff + pending: input chỉnh được */}
                                  {selectedPO.status === 'pending' && isWarehouseStaff ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={receivedItem?.receivedQuantity ?? detail.quantity}
                                      onChange={e => {
                                        const val = parseInt(e.target.value) || 0;
                                        setReceivedItems(prev =>
                                          prev.map(r => r.productId === detail.productId ? { ...r, receivedQuantity: val } : r)
                                        );
                                      }}
                                      className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-xs"
                                    />
                                  ) : (
                                    /* completed/cancelled: read-only */
                                    <span className={`font-bold font-mono ${detail.receivedQuantity !== null && detail.receivedQuantity !== detail.quantity ? 'text-amber-600' : 'text-gray-800'}`}>
                                      {detail.receivedQuantity ?? '—'}
                                      {detail.receivedQuantity !== null && detail.receivedQuantity !== detail.quantity && (
                                        <span className="ml-1 text-[9px] text-amber-500 font-normal">(khác đơn)</span>
                                      )}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Tổng cộng */}
                        {(selectedPO.details ?? []).length > 0 && (
                          <tfoot className="border-t border-gray-200 bg-gray-50">
                            <tr>
                              <td colSpan={3} className="px-3 py-2.5 font-black text-gray-700 text-[10px] uppercase tracking-wider text-right">Tổng giá trị đơn:</td>
                              <td className="px-3 py-2.5 text-right font-black text-emerald-700 font-mono">{formatVND(selectedPO.totalCost)}</td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>

                  {/* Status timeline — giữ nguyên từ UI gốc */}
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3.5">
                    <h4 className="font-bold text-gray-950 uppercase tracking-wide text-[10px]">Tiến độ lưu trữ đơn hàng</h4>
                    <div className="space-y-4 relative pl-4 border-l-2 border-blue-500/30">
                      <div className="relative">
                        <span className="absolute -left-[22px] top-1 bg-blue-500 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center shadow-3xs"></span>
                        <div className="font-bold text-gray-800 text-xs">Yêu cầu lập đơn nhập</div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">Yêu cầu nhập hàng được đăng ký trên hệ thống chuỗi bán lẻ bởi Ban Quản Lý.</p>
                      </div>
                      <div className="relative">
                        {selectedPO.status === 'pending' ? (
                          <>
                            <span className="absolute -left-[22px] top-1 bg-orange-400 w-3 h-3 rounded-full border-2 border-white animate-pulse"></span>
                            <div className="font-bold text-orange-600 text-xs">Đang chờ thủ kho kiểm định</div>
                            <p className="text-[10.5px] text-gray-400 mt-0.5">Xe tải chở hàng đang di chuyển hoặc đang dỡ hàng tại cửa hàng. Chờ nhân viên kho kiểm đếm thực tế và bấm nút duyệt.</p>
                          </>
                        ) : selectedPO.status === 'completed' ? (
                          <>
                            <span className="absolute -left-[22px] top-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></span>
                            <div className="font-bold text-emerald-600 text-xs">Phê duyệt - Nhập kho hoàn tất</div>
                            <p className="text-[10.5px] text-gray-400 mt-0.5">
                              Xác nhận bởi <span className="font-bold text-gray-700">{selectedPO.confirmer?.fullName ?? 'Thủ kho'}</span> lúc {selectedPO.confirmedAt ? fmtDate(selectedPO.confirmedAt) : '—'}.
                            </p>
                          </>
                        ) : (
                          <>
                            <span className="absolute -left-[22px] top-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white"></span>
                            <div className="font-bold text-red-600 text-xs">Đơn nhập đã hủy bỏ</div>
                            <p className="text-[10.5px] text-gray-400 mt-0.5">Giao dịch đã bị đình chỉ và thu hồi bởi ban quản lý hoặc bên phía đối tác phân phối.</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Confirm error */}
                  {confirmError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs font-medium">{confirmError}</div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              {/* Nút Xác nhận nhận hàng — chỉ WarehouseStaff, đơn pending */}
              {selectedPO.status === 'pending' && isWarehouseStaff && !detailLoading && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
                >
                  {confirmLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Đang xác nhận...</span></>
                    : <><Check className="w-4 h-4" /><span>Xác nhận nhận hàng</span></>
                  }
                </button>
              )}
              <button type="button" onClick={closeDetail}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-bold transition text-xs">
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TẠO ĐƠN NHẬP HÀNG (Manager - API) ================= */}
      {isCreatingPO && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Phát hành phiếu nhập hàng</h3>
                <p className="text-[10px] text-gray-400 mt-1">Yêu cầu nhà cung cấp vận chuyển hàng bổ sung</p>
              </div>
              <button onClick={() => setIsCreatingPO(false)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreatePO} className="p-5 space-y-4 font-medium max-h-[75vh] overflow-y-auto">
              {/* Supplier */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Đối tác cung cấp</label>
                {suppliersLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 py-2"><Loader2 className="w-4 h-4 animate-spin" /><span>Đang tải...</span></div>
                ) : apiSuppliers.length === 0 ? (
                  <p className="text-red-500 text-[10px]">Chưa có nhà cung cấp. Thêm vào bảng suppliers trước.</p>
                ) : (
                  <select value={newSupplierId} onChange={e => setNewSupplierId(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold">
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.supplierName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {/* Store */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Nhập về chi nhánh</label>
                <select value={newStoreId} onChange={e => setNewStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold">
                  <option value="">-- Chọn chi nhánh --</option>
                  {apiStores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                </select>
              </div>
              {/* Product search */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Thêm sản phẩm đặt hàng</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc SKU..."
                    className="pl-8 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs" />
                  {productSearchLoading && <Loader2 className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-400 animate-spin" />}
                  {productResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {productResults.map(p => (
                        <button key={p.id} type="button" onClick={() => addToCart(p)}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between">
                          <span className="font-bold text-gray-900">{p.productName}</span>
                          <span className="text-gray-400 text-[10px] font-mono">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Cart */}
              {cart.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Sản phẩm đã chọn</label>
                  {cart.map(item => (
                    <div key={item.productId} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{item.productName}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{item.sku}</p>
                      </div>
                      <div className="flex items-end gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] text-gray-400">SL</span>
                          <input type="number" min={1} value={item.quantity}
                            onChange={e => setCart(prev => prev.map(c => c.productId === item.productId ? { ...c, quantity: parseInt(e.target.value) || 1 } : c))}
                            className="w-16 border border-gray-300 rounded px-1.5 py-1 text-right text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] text-gray-400">Giá nhập (₫)</span>
                          <input type="number" min={0} value={item.unitCost}
                            onChange={e => setCart(prev => prev.map(c => c.productId === item.productId ? { ...c, unitCost: parseFloat(e.target.value) || 0 } : c))}
                            className="w-24 border border-gray-300 rounded px-1.5 py-1 text-right text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-400" />
                        </div>
                        <button type="button" onClick={() => setCart(prev => prev.filter(c => c.productId !== item.productId))}
                          className="text-red-400 hover:text-red-600 transition p-1"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-bold">Tổng chi phí dự kiến:</span>
                    <span className="font-mono font-black text-gray-950">{formatVND(cart.reduce((s, c) => s + c.quantity * c.unitCost, 0))}</span>
                  </div>
                </div>
              )}
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs font-medium">{createError}</div>
              )}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsCreatingPO(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition">Hủy bỏ</button>
                <button type="submit" disabled={createLoading}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 font-bold text-white rounded-lg transition flex items-center gap-2">
                  {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {createLoading ? 'Đang tạo...' : 'Phát hành yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CHI TIẾT ĐIỀU CHUYỂN (giữ nguyên gốc) ================= */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <ArrowLeftRight className="w-4 h-4 mr-2 text-[#3B82F6]" />Chi tiết phiếu điều chuyển hàng
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Mã vận đơn nội bộ: <span className="font-mono font-bold text-gray-600">{selectedTransfer.id}</span></p>
              </div>
              <button onClick={() => setSelectedTransfer(null)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-5 text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1"><span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Từ chi nhánh</span><span className="font-extrabold text-gray-900 text-xs block">{selectedTransfer.from}</span></div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1"><span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Đến chi nhánh</span><span className="font-extrabold text-gray-900 text-xs block">{selectedTransfer.to}</span></div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1"><span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sản phẩm luân chuyển</span><span className="font-semibold text-gray-900 text-xs block">{selectedTransfer.product}</span></div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1"><span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Số lượng</span><span className="font-black text-blue-600 text-xs block font-mono">{selectedTransfer.qty} sản phẩm</span></div>
                <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2"><span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ngày tạo phiếu</span><span className="font-semibold text-gray-800 text-xs block font-mono">{selectedTransfer.date}</span></div>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <h4 className="font-bold text-gray-950 uppercase tracking-wide text-[10px]">Tiến độ hành trình luân chuyển</h4>
                <div className="space-y-4 relative pl-4 border-l-2 border-blue-500/30">
                  <div className="relative"><span className="absolute -left-[22px] top-1 bg-blue-500 w-3 h-3 rounded-full border-2 border-white"></span><div className="font-bold text-gray-800 text-xs">Yêu cầu được lập</div><p className="text-[10.5px] text-gray-400 mt-0.5">Phiếu xuất kho điều chuyển sang chi nhánh khác đã được phê duyệt.</p></div>
                  <div className="relative">
                    {selectedTransfer.status === 'Chờ xác nhận' ? (
                      <><span className="absolute -left-[22px] top-1 bg-orange-400 w-3 h-3 rounded-full border-2 border-white animate-pulse"></span><div className="font-bold text-orange-600 text-xs">Đang vận chuyển & Chờ thủ kho xác nhận</div><p className="text-[10.5px] text-gray-400 mt-0.5">Hàng hóa đang trên xe trung chuyển hoặc đã đến nơi chờ dỡ xuống kho đích.</p></>
                    ) : (
                      <><span className="absolute -left-[22px] top-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></span><div className="font-bold text-emerald-600 text-xs">Hoàn thành nhập kho đích</div><p className="text-[10.5px] text-gray-400 mt-0.5">Thủ kho chi nhánh nhận hàng đã ký duyệt biên bản bàn giao.</p></>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              {selectedTransfer.status === 'Chờ xác nhận' && (
                <button type="button" onClick={() => { handleConfirmTransfer(selectedTransfer.id); setSelectedTransfer(null); }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1">
                  <Check className="w-4 h-4" /><span>Xác nhận nhận hàng</span>
                </button>
              )}
              <button type="button" onClick={() => setSelectedTransfer(null)} className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-bold transition text-xs">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TẠO PHIẾU ĐIỀU CHUYỂN (giữ nguyên gốc) ================= */}
      {isCreatingTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div><h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Lập lệnh điều chuyển nội bộ</h3><p className="text-[10px] text-gray-400 mt-1">Điều chuyển số lượng sản phẩm giữa các chi nhánh siêu thị</p></div>
              <button onClick={() => setIsCreatingTransfer(false)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4 font-medium">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Mặt hàng điều động</label>
                <select value={transferProduct} onChange={e => setTransferProduct(e.target.value)} className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold">
                  {products.map(p => <option key={p.productId} value={p.productId}>{p.productName} (Kho có: {p.stock} sp)</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Từ chi nhánh</label>
                  <select value={transferSource} onChange={e => setTransferSource(e.target.value)} className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-955 font-bold">
                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Đến chi nhánh</label>
                  <select value={transferDest} onChange={e => setTransferDest(e.target.value)} className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-955 font-bold">
                    {stores.map(s => <option key={s.id} value={s.id}>{s.storeName}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số lượng điều chuyển</label>
                <input type="number" min="1" required value={transferQty} onChange={e => setTransferQty(parseInt(e.target.value) || 1)} className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold" />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsCreatingTransfer(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition">Hủy bỏ</button>
                <button type="submit" className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition">Xác nhận lập lệnh</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
