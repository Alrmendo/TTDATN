import { useState, FormEvent, useEffect } from 'react';
import { Product, PurchaseOrder, Store } from '../types';
import { fetchStockByStore, setInventoryQuantity, ApiStockItem } from '../services/inventoryApi';
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
  Calendar
} from 'lucide-react';

interface WarehouseManagementProps {
  products: Product[];
  purchaseOrders: PurchaseOrder[];
  stores: Store[];
  activeTab: 'Tồn kho' | 'Đơn nhập hàng' | 'Điều chuyển hàng';
  onAdjustStock: (productId: string, newStock: number) => void;
  onConfirmPurchaseOrder: (orderId: string) => void;
  onAddNewPurchaseOrder?: (po: PurchaseOrder) => void;
  userRole?: string;
  /** storeId của nhân viên kho đang đăng nhập (Manager bỏ trống, tự chọn chi nhánh bằng dropdown) */
  currentUserStoreId?: string | null;
}

export default function WarehouseManagement({
  products,
  purchaseOrders,
  stores,
  activeTab,
  onAdjustStock,
  onConfirmPurchaseOrder,
  onAddNewPurchaseOrder,
  userRole = 'Nhân viên kho',
  currentUserStoreId = null
}: WarehouseManagementProps) {

  const isWarehouseStaff = userRole === 'Nhân viên kho';

  // ===== Tồn kho thực (API) =====
  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    isWarehouseStaff ? (currentUserStoreId || stores[0]?.id || '') : (stores[0]?.id || '')
  );
  const [apiStock, setApiStock] = useState<ApiStockItem[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(true);
  const [stockFetchError, setStockFetchError] = useState('');
  const [isSavingStock, setIsSavingStock] = useState(false);

  const loadStock = async (storeId: string) => {
    if (!storeId) return;
    setIsLoadingStock(true);
    setStockFetchError('');
    try {
      const data = await fetchStockByStore(storeId);
      setApiStock(data);
    } catch (err) {
      setStockFetchError(err instanceof Error ? err.message : 'Không thể tải tồn kho');
    } finally {
      setIsLoadingStock(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Tồn kho') {
      loadStock(selectedStoreId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedStoreId]);

  // Search & Filter state for Tồn kho
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');

  // Modal active states (điều chỉnh tồn kho thực tế — dùng dữ liệu API)
  const [editingStockItem, setEditingStockItem] = useState<ApiStockItem | null>(null);
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

  // Create Purchase Order form state
  const [poSupplier, setPoSupplier] = useState('Công ty Thực phẩm Masan');
  const [poBranch, setPoBranch] = useState('Chi nhánh Quận 1');
  const [poProduct, setPoProduct] = useState(products[0]?.productId || '');
  const [poQty, setPoQty] = useState(50);
  const [poCost, setPoCost] = useState(150000);
  const [isCreatingPO, setIsCreatingPO] = useState(false);

  // Toast / Notification status
  const [notification, setNotification] = useState<string | null>(null);

  // States for PO (Purchase Order) tracking/searching/filtering/paging
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState<'Tất cả' | 'Chờ xác nhận' | 'Hoàn thành' | 'Đã hủy'>('Tất cả');
  const [poCurrentPage, setPoCurrentPage] = useState(1);
  const poItemsPerPage = 5;
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const triggerNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    setPoCurrentPage(1);
  }, [poSearch, poStatusFilter]);

  useEffect(() => {
    setTransferCurrentPage(1);
  }, [transferStatusFilter]);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // ------------------ DATA CALCULATION FOR METRICS (Tồn kho — dữ liệu API theo chi nhánh) ------------------
  // Total distinct products đang có bản ghi tồn kho tại chi nhánh đang chọn
  const totalDistinctProducts = apiStock.length;

  // Sản phẩm dưới ngưỡng cảnh báo riêng của từng sản phẩm (lowStockThreshold, mặc định 10)
  const lowStockProducts = apiStock.filter(item => item.quantity < item.lowStockThreshold);
  const lowStockCount = lowStockProducts.length;

  // Pending purchase orders count
  const pendingOrdersCount = purchaseOrders.filter(po => po.status === 'Chờ xác nhận').length;

  // Filtered Products for the Tồn kho grid
  const filteredProducts = apiStock.filter(item => {
    const matchesSearch =
      (item.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || item.categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Unique categories list (bỏ qua sản phẩm chưa gán ngành hàng)
  const categoriesList = Array.from(new Set(apiStock.map(item => item.categoryName).filter((c): c is string => !!c)));

  // Handle Adjustment Submission — gọi PUT /api/inventory/:productId (đặt số tuyệt đối)
  const handleSaveStockAdjustment = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStockItem || !selectedStoreId) return;
    setIsSavingStock(true);
    try {
      const updated = await setInventoryQuantity(editingStockItem.productId, selectedStoreId, newStockVal);
      setApiStock(prev => prev.map(item =>
        item.productId === editingStockItem.productId
          ? { ...item, quantity: updated.quantity, lastUpdated: updated.lastUpdated }
          : item
      ));
      // Giữ tương thích với phần còn lại của app vẫn dùng products mock (vd. Dashboard cũ) — bỏ qua nếu không khớp ID
      onAdjustStock(editingStockItem.productId, newStockVal);
      setEditingStockItem(null);
      triggerNotification(`Đã cập nhật số lượng tồn kho sản phẩm ${editingStockItem.productName} thành công!`);
    } catch (err) {
      triggerNotification(err instanceof Error ? err.message : 'Cập nhật tồn kho thất bại, vui lòng thử lại.');
    } finally {
      setIsSavingStock(false);
    }
  };

  // Open Edit Stock adjustments
  const handleOpenEditStock = (item: ApiStockItem) => {
    setEditingStockItem(item);
    setNewStockVal(item.quantity);
  };

  // Handle local purchase order addition
  const handleCreateNewPurchaseOrder = (e: FormEvent) => {
    e.preventDefault();
    const targetProd = products.find(p => p.productId === poProduct);
    if (!targetProd) return;

    // find storeId corresponding to poBranch
    const matchedStore = stores.find(s => s.storeName === poBranch);
    const storeId = matchedStore ? matchedStore.id : 'CH001';

    // generate simple incremental PO id
    const newId = `PO${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      orderId: newId,
      supplierName: poSupplier,
      storeId: storeId,
      storeName: poBranch,
      totalCost: poQty * poCost,
      date: '2026-05-20 14:25',
      status: 'Chờ xác nhận'
    };

    if (onAddNewPurchaseOrder) {
      onAddNewPurchaseOrder(newPO);
    } else {
      // fallback alert if not wired
      purchaseOrders.unshift(newPO);
    }

    setIsCreatingPO(false);
    triggerNotification(`Đã tạo đơn yêu cầu nhập hàng ${newId} thành công (Chờ thủ kho duyệt nhập)!`);
  };


  // Handle custom branch stock transfers
  const handleCreateTransfer = (e: FormEvent) => {
    e.preventDefault();
    if (transferSource === transferDest) {
      alert('Chi nhánh nguồn và chi nhánh nhận hàng không thể trùng nhau!');
      return;
    }

    const prodObj = products.find(p => p.productId === transferProduct);
    if (!prodObj) return;

    if (prodObj.stock < transferQty) {
      alert(`Số lượng sản phẩm trong kho không đủ để điều chuyển! Chỉ còn lại ${prodObj.stock} sp.`);
      return;
    }

    // Deduct stock levels locally when creating
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
    triggerNotification(`Đã tạo yêu cầu điều chuyển ${transferQty} sp '${prodObj.productName}' sang ${newTransfer.to} (Chờ xác nhận)!`);
  };

  // Handle confirming a stock transfer receipt
  const handleConfirmTransfer = (id: string) => {
    const transferIndex = transfers.findIndex(t => t.id === id);
    if (transferIndex > -1) {
      const updated = [...transfers];
      updated[transferIndex] = {
        ...updated[transferIndex],
        status: 'Hoàn thành'
      };
      setTransfers(updated);
      triggerNotification(`Đã xác nhận nhận hàng và nhập kho thành công cho phiếu điều chuyển ${id}!`);
    }
  };

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

        {/* Floating notifications */}
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

          {/* Store selector (chỉ Manager mới được đổi; Nhân viên kho cố định theo chi nhánh của mình) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap">Chi nhánh xem tồn kho:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              disabled={isWarehouseStaff}
              className="flex-1 border border-gray-300 rounded-lg p-2 text-xs font-bold bg-white text-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.storeName}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => loadStock(selectedStoreId)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-bold text-xs flex items-center justify-center space-x-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStock ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>

          {stockFetchError && (
            <div className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
              {stockFetchError}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="warehouse-overview-cards">
            
            {/* Card 1: Tổng sản phẩm */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl">
                <Boxes className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng sản phẩm kinh doanh</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{isLoadingStock ? '—' : `${totalDistinctProducts} danh mục SKU`}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-1 block">Tại chi nhánh đang chọn</span>
              </div>
            </div>

            {/* Card 2: Sản phẩm sắp hết (highlighted in red/orange) */}
            <div className={`p-5 rounded-xl border flex items-center space-x-4 shadow-xs transition ${
              lowStockCount > 0 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-white border-gray-200'
            }`}>
              <div className={`p-3 rounded-xl ${
                lowStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-orange-50 text-orange-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Sản phẩm sắp hết</span>
                <span className={`text-base font-black font-mono mt-0.5 block ${lowStockCount > 0 ? 'text-red-600 font-black animate-pulse' : 'text-gray-950'}`}>
                  {isLoadingStock ? '—' : `${lowStockCount} SKU cần gom hàng`}
                </span>
                <span className="text-[10px] text-gray-400 font-medium mt-1 block">Dưới ngưỡng cảnh báo riêng từng sản phẩm</span>
              </div>
            </div>

            {/* Card 3: Đơn nhập hàng chờ xác nhận */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Đơn mua hàng chờ duyệt</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{pendingOrdersCount} lô hàng</span>
                <span className="text-[10px] text-amber-600 font-bold mt-1 block">Xác nhận nhập kho để cộng trừ số tồn</span>
              </div>
            </div>

          </div>

          {/* Action and Filter Control Panel */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Search inputs */}
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

            {/* Category filter */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white text-gray-900 focus:outline-none"
              >
                <option value="Tất cả">Tất cả ngành hàng</option>
                {categoriesList.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Clear filters or count display label */}
            <div className="md:col-span-3 text-right">
              <span className="text-xs font-bold text-gray-500">
                Hiển thị <span className="text-[#3B82F6] font-mono font-black">{filteredProducts.length}</span> sản phẩm
              </span>
            </div>

          </div>

          {/* Main Datatable */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left text-gray-600 border-collapse">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">Mã SP</th>
                    <th scope="col" className="px-5 py-3.5">Tên sản phẩm</th>
                    <th scope="col" className="px-5 py-3.5">Danh mục sản phẩm</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Tồn kho thực tế</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Ngưỡng cảnh báo</th>
                    <th scope="col" className="px-5 py-3.5 text-center">Trạng thái định mức</th>
                    <th scope="col" className="px-5 py-3.5 text-right w-32">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150/40 font-medium text-gray-700">
                  {isLoadingStock && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-400">
                        <RefreshCw className="w-6 h-6 text-gray-300 mx-auto stroke-1 mb-2 animate-spin" />
                        <p className="text-xs font-bold">Đang tải tồn kho...</p>
                      </td>
                    </tr>
                  )}

                  {!isLoadingStock && filteredProducts.map(item => {
                    // Status logic theo ngưỡng riêng của từng sản phẩm (lowStockThreshold)
                    const isOutOfStock = item.quantity === 0;
                    const isLowStock = item.quantity > 0 && item.quantity < item.lowStockThreshold;
                    
                    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    let statusLabel = "Đủ hàng";
                    if (isOutOfStock) {
                      badgeClass = "bg-red-50 text-red-700 border-red-150";
                      statusLabel = "Hết hàng";
                    } else if (isLowStock) {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                      statusLabel = "Sắp hết";
                    }

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-gray-50/40 transition-colors ${
                          isLowStock ? 'bg-amber-50/20' : isOutOfStock ? 'bg-red-50/10' : ''
                        }`}
                      >
                        
                        {/* SKU ID */}
                        <td className="px-5 py-3.5 font-bold font-mono text-gray-950 text-xs">{item.sku}</td>

                        {/* Product Name */}
                        <td className="px-5 py-3.5 text-gray-950 font-bold text-xs">{item.productName}</td>

                        {/* Category */}
                        <td className="px-5 py-3.5 text-gray-500 font-semibold">{item.categoryName || '—'}</td>

                        {/* Stock amount with highlighted warnings */}
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-mono text-sm font-black px-2 py-0.5 rounded ${
                            isOutOfStock 
                              ? 'text-red-700 bg-red-100 font-extrabold' 
                              : isLowStock 
                              ? 'text-amber-700 bg-amber-100 font-extrabold' 
                              : 'text-gray-900'
                          }`}>
                            {item.quantity}
                          </span>
                        </td>

                        {/* Constant/Required Warning Threshold */}
                        <td className="px-5 py-3.5 text-center font-bold font-mono text-gray-400">{item.lowStockThreshold} sp</td>

                        {/* Color-Coded badges */}
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex px-3 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => handleOpenEditStock(item)}
                            className="px-2.5 py-1 text-[10px] font-bold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] rounded bg-white text-gray-700 transition flex items-center justify-center space-x-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Cập nhật</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}

                  {!isLoadingStock && filteredProducts.length === 0 && (
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


      {/* ================= VIEW 2: ĐƠN NHẬP HÀNG ================= */}
      {activeTab === 'Đơn nhập hàng' && (() => {
        // Compute filtered PO list based on searched query and selected status filter
        const filteredPOList = purchaseOrders.filter(po => {
          const matchesSearch = po.orderId.toLowerCase().includes(poSearch.toLowerCase()) ||
                               po.supplierName.toLowerCase().includes(poSearch.toLowerCase());
          
          let poStatusVisual = po.status === 'Đã nhập kho' ? 'Hoàn thành' : po.status;
          const matchesStatus = poStatusFilter === 'Tất cả' || poStatusVisual === poStatusFilter;
          
          return matchesSearch && matchesStatus;
        });

        // Compute pagination
        const totalPOItems = filteredPOList.length;
        const totalPOPages = Math.ceil(totalPOItems / poItemsPerPage) || 1;
        const indexOfLastPOItem = poCurrentPage * poItemsPerPage;
        const indexOfFirstPOItem = indexOfLastPOItem - poItemsPerPage;
        const currentPOItems = filteredPOList.slice(indexOfFirstPOItem, indexOfLastPOItem);

        const isManager = userRole === 'Quản lý';

        return (
          <div className="space-y-6 animate-fadeIn text-xs">
            
            {/* Header Title Information */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-200 gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-950 font-sans tracking-tight">Đơn nhập hàng</h2>
                <p className="text-xs text-gray-400 mt-1">Quản lý và ký nhận các lô hàng vận chuyển từ các nhà phân phối và nhà cung cấp đối tác.</p>
              </div>
            </div>

            {/* Top Action Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Search & Filter controls */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={poSearch}
                    onChange={(e) => setPoSearch(e.target.value)}
                    placeholder="Tìm theo mã đơn hoặc nhà cung cấp"
                    className="pl-9 pr-4 py-2 w-full border border-gray-300 rounded-lg bg-gray-50/50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition outline-none text-xs"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-gray-500 font-bold whitespace-nowrap">Trạng thái:</span>
                  <select
                    value={poStatusFilter}
                    onChange={(e) => setPoStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-semibold"
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="Chờ xác nhận">Chờ xác nhận</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Đã hủy">Đã hủy</option>
                  </select>
                </div>

              </div>

              {/* Action Button: Tạo đơn nhập hàng */}
              <div className="w-full md:w-auto text-right">
                <button
                  type="button"
                  disabled={!isManager}
                  onClick={() => setIsCreatingPO(true)}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition uppercase tracking-wider ${
                    isManager 
                      ? 'bg-[#3B82F6] hover:bg-blue-600 text-white cursor-pointer shadow-xs shadow-blue-500/10' 
                      : 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                  title={!isManager ? 'Chỉ Quản lý mới có quyền tạo đơn nhập hàng mới' : 'Tạo đơn nhập hàng mới'}
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo đơn nhập hàng</span>
                  {!isManager && <span className="text-[9px] font-normal lowercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1">Quản lý</span>}
                </button>
              </div>

            </div>

            {/* Table or Data Grid block */}
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
                    {currentPOItems.map((po) => {
                      const isPending = po.status === 'Chờ xác nhận';
                      const isCancelled = po.status === 'Đã hủy';
                      const isCompleted = po.status === 'Đã nhập kho';

                      return (
                        <tr key={po.orderId} className="hover:bg-gray-50/50 transition">
                          {/* Mã đơn */}
                          <td className="py-3.5 px-4 font-bold text-[#3B82F6] font-mono text-xs">
                            {po.orderId}
                          </td>

                          {/* Nhà cung cấp */}
                          <td className="py-3.5 px-4 font-bold text-gray-900">
                            {po.supplierName}
                          </td>

                          {/* Chi nhánh */}
                          <td className="py-3.5 px-4 text-gray-600 font-medium font-semibold">
                            {po.storeName}
                          </td>

                          {/* Ngày tạo */}
                          <td className="py-3.5 px-4 text-gray-500 font-mono">
                            {po.date}
                          </td>

                          {/* Tổng tiền */}
                          <td className="py-3.5 px-4 font-bold text-gray-950 font-mono">
                            {formatVND(po.totalCost)}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-4">
                            {isPending && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-850 border border-orange-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>
                                Chờ xác nhận
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-850 border border-emerald-250 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-650 mr-1.5"></span>
                                Hoàn thành
                              </span>
                            )}
                            {isCancelled && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-850 border border-red-250">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></span>
                                Đã hủy
                              </span>
                            )}
                          </td>

                          {/* Hành động */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              
                              {/* Xác nhận nhận hàng */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => onConfirmPurchaseOrder(po.orderId)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-3xs flex items-center space-x-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Xác nhận nhận hàng</span>
                                </button>
                              )}

                              {/* Xem chi tiết */}
                              <button
                                type="button"
                                onClick={() => setSelectedPO(po)}
                                className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-[11px] font-bold transition"
                              >
                                Xem chi tiết
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {currentPOItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 bg-white text-center text-gray-400 font-bold">
                          <Truck className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2" />
                          <p className="text-xs font-bold text-gray-500">Không tìm thấy yêu cầu nhập hàng nào.</p>
                          <p className="text-[10px] text-gray-400 font-normal mt-1">Điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để kiểm định lại.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              {totalPOItems > 0 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3.5 flex items-center justify-between">
                  <div className="text-gray-500 font-semibold text-[11px]">
                    Hiển thị <span className="font-bold text-gray-900">{indexOfFirstPOItem + 1}</span> - <span className="font-bold text-gray-900">{Math.min(indexOfLastPOItem, totalPOItems)}</span> trong số <span className="font-bold text-gray-900">{totalPOItems}</span> đơn nhập hàng
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    {/* Quay lại button */}
                    <button
                      type="button"
                      disabled={poCurrentPage === 1}
                      onClick={() => setPoCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition text-[11px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      Quay lại
                    </button>

                    {/* Page indexes */}
                    {Array.from({ length: totalPOPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPoCurrentPage(pageNum)}
                        className={`w-7.5 h-7.5 flex items-center justify-center font-bold text-xs rounded-lg transition ${
                          poCurrentPage === pageNum 
                            ? 'bg-[#3B82F6] text-white' 
                            : 'border border-gray-300 text-gray-750 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {/* Tiếp theo button */}
                    <button
                      type="button"
                      disabled={poCurrentPage === totalPOPages}
                      onClick={() => setPoCurrentPage(prev => Math.min(totalPOPages, prev + 1))}
                      className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition text-[11px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      Tiếp theo
                    </button>

                  </div>
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* ================= VIEW 3: ĐIỀU CHUYỂN HÀNG ================= */}
      {activeTab === 'Điều chuyển hàng' && (() => {
        // Filter transfers based on status dropdown
        const filteredTransfers = transfers.filter(tr => {
          const matchesStatus = transferStatusFilter === 'Tất cả' || tr.status === transferStatusFilter;
          return matchesStatus;
        });

        // Compute pagination calculations
        const totalTrItems = filteredTransfers.length;
        const totalTrPages = Math.ceil(totalTrItems / transferItemsPerPage) || 1;
        const indexOfLastTrItem = transferCurrentPage * transferItemsPerPage;
        const indexOfFirstTrItem = indexOfLastTrItem - transferItemsPerPage;
        const currentTransfersList = filteredTransfers.slice(indexOfFirstTrItem, indexOfLastTrItem);

        const isManager = userRole === 'Quản lý';

        return (
          <div className="space-y-6 animate-fadeIn text-xs">
            
            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-200 gap-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900 font-sans tracking-tight">Điều chuyển hàng giữa chi nhánh</h2>
                <p className="text-xs text-gray-400 mt-1">Quản lý, cấp lệnh và ký nhận vận chuyển hàng hóa nội bộ giữa các chi nhánh siêu thị.</p>
              </div>
            </div>

            {/* Top Action Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Status Filter */}
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <span className="text-gray-500 font-bold whitespace-nowrap">Trạng thái:</span>
                <select
                  value={transferStatusFilter}
                  onChange={(e) => setTransferStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-xs font-semibold"
                >
                  <option value="Tất cả">Tất cả</option>
                  <option value="Chờ xác nhận">Chờ xác nhận</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                </select>
              </div>

              {/* Action Button: Tạo yêu cầu điều chuyển */}
              <div className="w-full md:w-auto text-right">
                <button
                  type="button"
                  disabled={!isManager}
                  onClick={() => setIsCreatingTransfer(true)}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition uppercase tracking-wider ${
                    isManager 
                      ? 'bg-[#3B82F6] hover:bg-blue-600 text-white cursor-pointer shadow-xs shadow-blue-500/10' 
                      : 'bg-gray-150 text-gray-400 cursor-not-allowed border border-gray-200'
                  }`}
                  title={!isManager ? 'Chỉ Quản lý mới có quyền tạo lệnh điều chuyển mới' : 'Lập lệnh điều chuyển nội bộ'}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Tạo yêu cầu điều chuyển</span>
                  {!isManager && <span className="text-[9px] font-normal lowercase bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-1">Quản lý</span>}
                </button>
              </div>

            </div>

            {/* Table or Data Grid block */}
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
                      const isCompleted = tr.status === 'Hoàn thành';

                      return (
                        <tr key={tr.id} className="hover:bg-gray-50/50 transition">
                          {/* Mã phiếu */}
                          <td className="py-3.5 px-4 font-bold text-[#3B82F6] font-mono text-xs">
                            {tr.id}
                          </td>

                          {/* Từ chi nhánh */}
                          <td className="py-3.5 px-4 font-semibold text-gray-900">
                            {tr.from}
                          </td>

                          {/* Đến chi nhánh */}
                          <td className="py-3.5 px-4 font-semibold text-gray-900">
                            {tr.to}
                          </td>

                          {/* Sản phẩm */}
                          <td className="py-3.5 px-4 text-gray-650 font-bold">
                            {tr.product}
                          </td>

                          {/* Số lượng */}
                          <td className="py-3.5 px-4 font-bold text-gray-950 font-mono text-xs">
                            {tr.qty} sp
                          </td>

                          {/* Ngày tạo */}
                          <td className="py-3.5 px-4 text-gray-500 font-mono">
                            {tr.date}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3.5 px-4">
                            {isPending ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-850 border border-orange-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mr-1.5 animate-pulse"></span>
                                Chờ xác nhận
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-850 border border-emerald-250 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-650 mr-1.5"></span>
                                Hoàn thành
                              </span>
                            )}
                          </td>

                          {/* Hành động */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              
                              {/* Xác nhận nhận hàng */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmTransfer(tr.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-3xs flex items-center space-x-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Xác nhận nhận hàng</span>
                                </button>
                              )}

                              {/* Xem chi tiết */}
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

              {/* Pagination footer */}
              {totalTrItems > 0 && (
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-3.5 flex items-center justify-between">
                  <div className="text-gray-500 font-semibold text-[11px]">
                    Hiển thị <span className="font-bold text-gray-900">{indexOfFirstTrItem + 1}</span> - <span className="font-bold text-gray-900">{Math.min(indexOfLastTrItem, totalTrItems)}</span> trong số <span className="font-bold text-gray-900">{totalTrItems}</span> vận đơn chuyển
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    {/* Quay lại button */}
                    <button
                      type="button"
                      disabled={transferCurrentPage === 1}
                      onClick={() => setTransferCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition text-[11px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      Quay lại
                    </button>

                    {/* Page indexes */}
                    {Array.from({ length: totalTrPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setTransferCurrentPage(pageNum)}
                        className={`w-7.5 h-7.5 flex items-center justify-center font-bold text-xs rounded-lg transition ${
                          transferCurrentPage === pageNum 
                            ? 'bg-[#3B82F6] text-white' 
                            : 'border border-gray-300 text-gray-750 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    {/* Tiếp theo button */}
                    <button
                      type="button"
                      disabled={transferCurrentPage === totalTrPages}
                      onClick={() => setTransferCurrentPage(prev => Math.min(totalTrPages, prev + 1))}
                      className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition text-[11px] cursor-pointer disabled:cursor-not-allowed"
                    >
                      Tiếp theo
                    </button>

                  </div>
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {/* ================= MODAL DIALOG: CẬP NHẬT TỒN KHO THỰC TẾ ================= */}
      {editingStockItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Điều chỉnh số lượng kho</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cập nhật khẩn cấp tồn kho cho sản phẩm này</p>
              </div>
              <button 
                onClick={() => setEditingStockItem(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveStockAdjustment} className="p-5 space-y-4">
              
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Sản phẩm điều chỉnh</span>
                <span className="font-bold text-gray-900 text-xs block">{editingStockItem.productName}</span>
                <span className="text-[10px] text-gray-400 font-mono block">Mã: {editingStockItem.sku} &bull; Ngành: {editingStockItem.categoryName || '—'}</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số lượng lưu kho mới</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Ví dụ: 25"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-black text-sm"
                />
                <p className="text-[10px] text-gray-400 font-medium">Báo cáo sẽ tự động ghi dấu theo số tồn kho mới này sau phân tích.</p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStockItem(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingStock}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSavingStock ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL DIALOG: CHI TIẾT ĐƠN NHẬP HÀNG ================= */}
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
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Mã đơn hệ thống: <span className="font-mono font-bold text-gray-600">{selectedPO.orderId}</span></p>
              </div>
              <button 
                onClick={() => setSelectedPO(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5">
              
              {/* Primary information cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Nhà cung cấp</span>
                  <span className="font-extrabold text-gray-900 text-xs block">{selectedPO.supplierName}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Chi nhánh nhận</span>
                  <span className="font-extrabold text-gray-900 text-xs block">{selectedPO.storeName}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ngày tạo tài liệu</span>
                  <span className="font-semibold text-gray-800 text-xs block font-mono">{selectedPO.date}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Tổng giá trị thanh toán</span>
                  <span className="font-black text-[#10B981] text-xs block font-mono">{formatVND(selectedPO.totalCost)}</span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3.5">
                <h4 className="font-bold text-gray-950 uppercase tracking-wide text-[10px]">Tiến độ lưu trữ đơn hàng</h4>
                
                <div className="space-y-4 relative pl-4 border-l-2 border-blue-500/30">
                  
                  {/* Step 1: Created */}
                  <div className="relative">
                    <span className="absolute -left-[22px] top-1 bg-blue-500 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center shadow-3xs"></span>
                    <div className="font-bold text-gray-800 text-xs">Yêu cầu lập đơn nhập</div>
                    <p className="text-[10.5px] text-gray-400 mt-0.5">Yêu cầu nhập hàng được đăng ký trên hệ thống chuỗi bán lẻ bởi Ban Quản Lý.</p>
                  </div>

                  {/* Step 2: Confirmation / Action */}
                  <div className="relative">
                    {selectedPO.status === 'Chờ xác nhận' ? (
                      <>
                        <span className="absolute -left-[22px] top-1 bg-orange-400 w-3 h-3 rounded-full border-2 border-white animate-pulse"></span>
                        <div className="font-bold text-orange-600 text-xs">Đang chờ thủ kho kiểm định</div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">Xe tải chở hàng đang di chuyển hoặc đang dỡ hàng tại cửa hàng. Chờ nhân viên kho kiểm đếm thực tế và bấm nút duyệt.</p>
                      </>
                    ) : selectedPO.status === 'Đã nhập kho' ? (
                      <>
                        <span className="absolute -left-[22px] top-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></span>
                        <div className="font-bold text-emerald-600 text-xs">Phê duyệt - Nhập kho hoàn tất</div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">Hàng hóa đã được dỡ, kiểm toán số lượng trùng khớp và ký biên bản điện tử cộng dồn trực tiếp vào số lượng tồn kho của chuỗi chi nhánh.</p>
                      </>
                    ) : (
                      <>
                        <span className="absolute -left-[22px] top-1 bg-red-550 w-3 h-3 rounded-full border-2 border-white"></span>
                        <div className="font-bold text-red-650 text-xs">Đơn nhập đã hủy bỏ</div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">Giao dịch đã bị đình chỉ và thu hồi bởi ban quản lý hoặc bên phía đối tác phân phối.</p>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* Items Breakdown list placeholder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-gray-150 pb-2">
                  <span className="font-bold text-gray-900">Danh mục sản phẩm</span>
                  <span className="text-[10px] text-gray-400">Ước tính định số</span>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50/50 rounded-lg">
                    <div>
                      <div className="font-bold text-gray-800 font-sans">Lô hàng tổng hợp ({selectedPO.orderId})</div>
                      <div className="text-[10px] text-gray-400 font-medium">Nhà cung cấp: {selectedPO.supplierName}</div>
                    </div>
                    <span className="font-mono font-bold text-gray-950">{formatVND(selectedPO.totalCost)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              
              {selectedPO.status === 'Chờ xác nhận' && (
                <button
                  type="button"
                  onClick={() => {
                    onConfirmPurchaseOrder(selectedPO.orderId);
                    setSelectedPO(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác nhận nhận hàng</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedPO(null)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-bold transition text-xs"
              >
                Đóng cửa sổ
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL DIALOG: PHÁT HÀNH ĐƠN NHẬP MỚI ================= */}
      {isCreatingPO && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Phát hành phiếu nhập hàng</h3>
                <p className="text-[10px] text-gray-400 mt-1">Yêu cầu nhà cung cấp vận chuyển hàng bổ sung</p>
              </div>
              <button 
                onClick={() => setIsCreatingPO(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateNewPurchaseOrder} className="p-5 space-y-4 text-xs font-medium">
              
              {/* Supplier */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Đối tác cung cấp</label>
                <select
                  value={poSupplier}
                  onChange={(e) => setPoSupplier(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                >
                  <option value="Công ty Thực phẩm Masan">Công ty Thực phẩm Masan</option>
                  <option value="Sữa Vinamilk Việt Nam">Sữa Vinamilk Việt Nam</option>
                  <option value="Tập đoàn Unilever VN">Tập đoàn Unilever VN</option>
                  <option value="Hợp tác xã Nông nghiệp Sạch">Hợp tác xã Nông nghiệp Sạch</option>
                </select>
              </div>

              {/* Store destination */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Nhập về chi nhánh cửa hàng</label>
                <select
                  value={poBranch}
                  onChange={(e) => setPoBranch(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.storeName}>{s.storeName}</option>
                  ))}
                </select>
              </div>

              {/* Product */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase font-semibold">Sản phẩm đặt hàng</label>
                <select
                  value={poProduct}
                  onChange={(e) => {
                    setPoProduct(e.target.value);
                    const prodCost = products.find(p => p.productId === e.target.value)?.cost || 10000;
                    setPoCost(prodCost);
                  }}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950"
                >
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>{p.productName} (Vốn nhập: {formatVND(p.cost)})</option>
                  ))}
                </select>
              </div>

              {/* Quantity vs Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Số lượng đặt</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={poQty}
                    onChange={(e) => setPoQty(parseInt(e.target.value) || 1)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Đơn giá nhập ước tính</label>
                  <input
                    type="number"
                    required
                    value={poCost}
                    onChange={(e) => setPoCost(parseInt(e.target.value) || 1000)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Estimation total */}
              <div className="p-3 bg-blue-50 text-blue-900 rounded-lg flex justify-between items-center text-xs">
                <span className="font-bold">Tổng chi phí dự kiến:</span>
                <span className="font-mono text-sm font-black text-gray-950">{formatVND(poQty * poCost)}</span>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingPO(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Phát hành yêu cầu
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
      {/* ================= MODAL DIALOG: CHI TIẾT ĐIỀU CHUYỂN HÀNG ================= */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <ArrowLeftRight className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Chi tiết phiếu điều chuyển hàng
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Mã vận đơn nội bộ: <span className="font-mono font-bold text-gray-600">{selectedTransfer.id}</span></p>
              </div>
              <button 
                onClick={() => setSelectedTransfer(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-5 text-gray-700">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Từ chi nhánh</span>
                  <span className="font-extrabold text-gray-900 text-xs block">{selectedTransfer.from}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider font-semibold">Đến chi nhánh</span>
                  <span className="font-extrabold text-gray-900 text-xs block">{selectedTransfer.to}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Sản phẩm luân chuyển</span>
                  <span className="font-semibold text-gray-900 text-xs block">{selectedTransfer.product}</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Số lượng luân chuyển</span>
                  <span className="font-black text-blue-600 text-xs block font-mono">{selectedTransfer.qty} sản phẩm</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ngày tạo phiếu</span>
                  <span className="font-semibold text-gray-800 text-xs block font-mono">{selectedTransfer.date}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                <h4 className="font-bold text-gray-950 uppercase tracking-wide text-[10px]">Tiến độ hành trình luân chuyển</h4>
                <div className="space-y-4 relative pl-4 border-l-2 border-blue-500/30">
                  <div className="relative">
                    <span className="absolute -left-[22px] top-1 bg-blue-500 w-3 h-3 rounded-full border-2 border-white"></span>
                    <div className="font-bold text-gray-800 text-xs">Yêu cầu được lập</div>
                    <p className="text-[10.5px] text-gray-400 mt-0.5">Phiếu xuất kho điều chuyển sang chi nhánh khác đã được phê duyệt.</p>
                  </div>
                  <div className="relative">
                    {selectedTransfer.status === 'Chờ xác nhận' ? (
                      <>
                        <span className="absolute -left-[22px] top-1 bg-orange-400 w-3 h-3 rounded-full border-2 border-white animate-pulse"></span>
                        <div className="font-bold text-orange-600 text-xs">Đang vận chuyển & Chờ thủ kho nhận hàng xác nhận</div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">Hàng hóa đang trên xe trung chuyển hoặc đã đến nơi chờ dỡ xuống kho đích.</p>
                      </>
                    ) : (
                      <>
                        <span className="absolute -left-[22px] top-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-white"></span>
                        <div className="font-bold text-emerald-600 text-xs">Hoàn thành nhập kho đích</div>
                        <p className="text-[10.5px] text-gray-400 mt-0.5">Thủ kho chi nhánh nhận hàng điện tử đã ký duyệt biên bản bàn giao, hàng hóa lưu kho đích thành công.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              {selectedTransfer.status === 'Chờ xác nhận' && (
                <button
                  type="button"
                  onClick={() => {
                    handleConfirmTransfer(selectedTransfer.id);
                    setSelectedTransfer(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác nhận nhận hàng</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-bold transition text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DIALOG: TẠO MỚI PHIẾU ĐIỀU CHUYỂN ================= */}
      {isCreatingTransfer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Lập lệnh điều chuyển nội bộ</h3>
                <p className="text-[10px] text-gray-400 mt-1">Điều chuyển số lượng sản phẩm giữa các chi nhánh siêu thị</p>
              </div>
              <button 
                onClick={() => setIsCreatingTransfer(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4 text-xs font-medium">
              
              {/* Product selection */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Mặt hàng điều động</label>
                <select
                  value={transferProduct}
                  onChange={(e) => setTransferProduct(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                >
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>
                      {p.productName} (Kho có: {p.stock} sp)
                    </option>
                  ))}
                </select>
              </div>

              {/* Source & Destination */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase font-semibold">Từ chi nhánh</label>
                  <select
                    value={transferSource}
                    onChange={(e) => setTransferSource(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-955 font-bold animate-pulse"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Đến chi nhánh</label>
                  <select
                    value={transferDest}
                    onChange={(e) => setTransferDest(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-955 font-bold"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số lượng điều chuyển</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(parseInt(e.target.value) || 1)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingTransfer(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Xác nhận lập lệnh
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
