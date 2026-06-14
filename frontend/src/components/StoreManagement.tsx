import { useState, useEffect, FormEvent } from 'react';
import { Store, Employee, Invoice } from '../types';
import { 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  User, 
  Store as StoreIcon, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Building2, 
  Edit3, 
  Info,
  Calendar,
  ShoppingBag
} from 'lucide-react';

interface StoreManagementProps {
  stores: Store[];
  employees: Employee[];
  invoices?: Invoice[];
}

// Baseline mock revenues to construct realistic performance figures (200M+, etc.)
const BASELINE_REVENUES: Record<string, number> = {
  'CH001': 248500000,
  'CH002': 185200000,
  'CH003': 142000000,
};

export default function StoreManagement({ 
  stores, 
  employees, 
  invoices = [] 
}: StoreManagementProps) {
  
  // Localized stores state supporting instant smooth updates with key structures
  const [localStores, setLocalStores] = useState<Store[]>(stores);

  // Synchronize dynamic parent stores state with local states
  useEffect(() => {
    setLocalStores(stores);
  }, [stores]);

  // Search filter terms
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states for table bottom row
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal active flags
  const [isAdding, setIsAdding] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  // Form field variables (Create)
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newManager, setNewManager] = useState('');
  const [newBaselineRev, setNewBaselineRev] = useState(120000000);

  // Form field variables (Edit)
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editManager, setEditManager] = useState('');

  // Custom base state to store newly created baseline revenues
  const [customRevenues, setCustomRevenues] = useState<Record<string, number>>({});

  // Toast / System indicator messaging channel
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // ------------------ BUSINESS CALCULATIONS ------------------
  
  // Staff count lookup per store id
  const getStaffCount = (storeId: string) => {
    return employees.filter(e => e.storeId === storeId).length;
  };

  // Get active staff list of store
  const getStoreStaffList = (storeId: string) => {
    return employees.filter(e => e.storeId === storeId);
  };

  // Compute live dynamic branch revenue based on transaction logs + baseline figures
  const getBranchRevenue = (storeId: string, storeName: string) => {
    const base = customRevenues[storeId] !== undefined ? customRevenues[storeId] : (BASELINE_REVENUES[storeId] || 75000000);
    // filter completed invoices for this storeName
    const invoiceSum = invoices
      .filter(inv => inv.storeName === storeName && inv.status === 'Hoàn thành')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);

    return base + invoiceSum;
  };

  // Get all invoice transactions related to this store
  const getStoreInvoices = (storeName: string) => {
    return invoices.filter(inv => inv.storeName === storeName);
  };

  // Multi-field searching (matches store name, code, phone, master manager)
  const filteredStores = localStores.filter(store => {
    const matchesSearch = 
      store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.managerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination parameters
  const totalItems = filteredStores.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStores.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // ------------------ SUBMIT HANDLERS ------------------

  // Adding new branch submit logic
  const handleAddNewStoreSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim() || !newPhone.trim() || !newManager.trim()) {
      alert('Vui lòng điền đầy đủ tất cả thông tin chi nhánh!');
      return;
    }

    const nextId = `CH${String(localStores.length + 1).padStart(3, '0')}`;
    const newStoreObj: Store = {
      id: nextId,
      storeName: newName.trim(),
      address: newAddress.trim(),
      phone: newPhone.trim(),
      managerName: newManager.trim()
    };

    // Append to local state list
    setLocalStores([...localStores, newStoreObj]);
    
    // Save custom baseline revenue
    setCustomRevenues(prev => ({
      ...prev,
      [nextId]: newBaselineRev
    }));

    // Reset forms
    setNewName('');
    setNewAddress('');
    setNewPhone('');
    setNewManager('');
    setNewBaselineRev(120000000);
    setIsAdding(false);

    showToast(`Đã thiết lập và cấp phép hoạt động chi nhánh ${newName} (${nextId})`);
  };

  // Open Edit branch modal
  const handleOpenEditStoreModal = (store: Store) => {
    setEditingStore(store);
    setEditName(store.storeName);
    setEditAddress(store.address);
    setEditPhone(store.phone);
    setEditManager(store.managerName);
  };

  // Save edited edits
  const handleSaveEditStoreSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;

    if (!editName.trim() || !editAddress.trim() || !editPhone.trim() || !editManager.trim()) {
      alert('Vui lòng điền đầy đủ thông tin nâng cấp!');
      return;
    }

    const updated = localStores.map(s => {
      if (s.id === editingStore.id) {
        return {
          ...s,
          storeName: editName.trim(),
          address: editAddress.trim(),
          phone: editPhone.trim(),
          managerName: editManager.trim()
        };
      }
      return s;
    });

    setLocalStores(updated);
    
    // If selectedStore is active, sync its values too
    if (selectedStore && selectedStore.id === editingStore.id) {
      setSelectedStore({
        ...selectedStore,
        storeName: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim(),
        managerName: editManager.trim()
      });
    }

    setEditingStore(null);
    showToast(`Đã cập nhật thay đổi chi nhánh ${editName} thành công!`);
  };

  // Computed metrics for cards
  const activeBranchCount = localStores.length;
  const systemGrandRevenue = localStores.reduce((acc, s) => acc + getBranchRevenue(s.id, s.storeName), 0);
  const systemGrandEmployees = localStores.reduce((acc, s) => acc + getStaffCount(s.id), 0);

  return (
    <div className="space-y-6">

      {/* Dynamic Header Block with Alert Toast */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="branch-page-title">
            Quản lý chi nhánh
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi mạng lưới kinh doanh chi nhánh, chỉ số nhân sự tổng hợp, doanh số doanh thu tháng và cơ cấu điều khiển chuỗi.
          </p>
        </div>

        {notification && (
          <div className="px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Top action metric widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="branch-metrics-widgets">
        
        {/* Card 1: Số chi nhánh hoạt động */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl font-bold">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Chi nhánh trực thuộc</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">{activeBranchCount} chi nhánh</span>
            <span className="text-[10px] text-emerald-650 font-semibold mt-1 block">100% Đang hoạt động thông suốt</span>
          </div>
        </div>

        {/* Card 2: Tổng nhân viên hệ thống */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Tổng lực lượng nhân sự</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">{systemGrandEmployees} nhân viên</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Phân chia quản lý theo địa bàn</span>
          </div>
        </div>

        {/* Card 3: Grand Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Tổng doanh thu kết chuyển tháng</span>
            <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">{formatVND(systemGrandRevenue)}</span>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Tự động đồng bộ hóa hóa đơn POS</span>
          </div>
        </div>

      </div>

      {/* TOP CONFIG BAR: SEARCH & CREATE TRIGGER */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input bar */}
        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên chi nhánh, mã, quản trị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Create Store modal trigger */}
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm chi nhánh</span>
        </button>

      </div>

      {/* 3-COLUMN BEAUTIFUL CARD-GRID OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="branch-cards-panel">
        {filteredStores.map((store) => {
          const staffCount = getStaffCount(store.id);
          const monthlyRevenue = getBranchRevenue(store.id, store.storeName);

          return (
            <div 
              key={store.id} 
              className="bg-white rounded-2xl border border-gray-200 shadow-3xs hover:shadow-2xs transition-all duration-250 overflow-hidden flex flex-col justify-between p-5 space-y-4 relative group"
            >
              {/* Header card section */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 text-[#3B82F6] rounded-xl group-hover:scale-105 transition-transform duration-200">
                    <StoreIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-950 text-sm tracking-tight">{store.storeName}</h4>
                    <span className="text-[10px] text-gray-400 font-mono font-bold tracking-widest">{store.id}</span>
                  </div>
                </div>

                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang hoạt động
                </span>
              </div>

              {/* Central attributes body */}
              <div className="space-y-2 text-xs text-gray-600">
                <p className="flex items-start">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-gray-500 font-medium">{store.address}</span>
                </p>
                <p className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <span>Quản lý: <span className="font-bold text-gray-800">{store.managerName}</span></span>
                </p>
                <p className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <span className="font-mono text-gray-500">{store.phone}</span>
                </p>
              </div>

              {/* Embedded Mini KPI block */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[9px] text-gray-405 font-bold uppercase tracking-wider text-gray-400">Số nhân viên</span>
                  <span className="text-xs font-black text-gray-950 font-mono">{staffCount} nhân viên</span>
                </div>
                <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/40">
                  <span className="block text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Doanh thu tháng</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">{formatVND(monthlyRevenue)}</span>
                </div>
              </div>

              {/* Actions element right inside card */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedStore(store)}
                  className="w-full text-center py-2 border border-gray-200 hover:border-[#3B82F6] hover:bg-blue-50/50 hover:text-[#3B82F6] text-gray-700 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span>Xem chi tiết</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-3">
          Danh sách chi tiết hệ thống chi nhánh
        </h3>

        {/* DỮ LIỆU GRID DANH SÁCH - TRẢI NGHIỆM TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto text-xs font-medium">
            <table className="w-full text-left text-gray-600 border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Mã CN</th>
                  <th scope="col" className="px-5 py-3.5">Tên chi nhánh</th>
                  <th scope="col" className="px-5 py-3.5">Địa chỉ</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Số nhân viên</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Doanh thu tháng</th>
                  <th scope="col" className="px-5 py-3.5 text-center">Trạng thái</th>
                  <th scope="col" className="px-5 py-3.5 text-right w-44">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150/40 text-xs text-gray-750">
                {currentItems.map((store) => {
                  const staffCount = getStaffCount(store.id);
                  const monthlyRevenue = getBranchRevenue(store.id, store.storeName);

                  return (
                    <tr key={store.id} className="hover:bg-gray-50/40 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-3.5 font-bold font-mono text-gray-950">{store.id}</td>

                      {/* Name */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-gray-950">{store.storeName}</div>
                        <div className="text-[10px] text-gray-400">QL: {store.managerName}</div>
                      </td>

                      {/* Address */}
                      <td className="px-5 py-3.5 text-gray-500 max-w-sm truncate" title={store.address}>
                        {store.address}
                      </td>

                      {/* Staff score count */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold font-mono bg-blue-50 text-[#3B82F6] border border-blue-100/50">
                          {staffCount}
                        </span>
                      </td>

                      {/* Monthly Revenue badge representation */}
                      <td className="px-5 py-3.5 text-center font-mono">
                        <span className="font-extrabold text-gray-900 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-100/50">
                          {formatVND(monthlyRevenue)}
                        </span>
                      </td>

                      {/* Trạng thái - green badge */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                          Đang hoạt động
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          
                          {/* Sửa button */}
                          <button
                            onClick={() => handleOpenEditStoreModal(store)}
                            className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-blue-50/10 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                            title="Sửa thông tin chi nhánh"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>

                          {/* Xem chi tiết button */}
                          <button
                            onClick={() => setSelectedStore(store)}
                            className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                            title="Báo cáo chi tiết hoạt động"
                          >
                            <Info className="w-3 h-3" />
                            <span>Chi tiết</span>
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredStores.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400">
                      <StoreIcon className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-bounce" />
                      <p className="text-xs font-bold">Không tìm thấy chi nhánh nào trùng khớp diện quét!</p>
                      <p className="text-[10px] text-gray-400 mt-1">Xin vui lòng kiểm tra kiểm tìm theo tên gọi hoặc số định danh khác</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* BOTTOM PAGINATION TABLE FEET */}
          <div className="bg-gray-50/60 px-5 py-3.5 border-t border-gray-150/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            
            <div className="text-gray-500 font-medium">
              Hiển thị <span className="font-bold text-gray-950 font-mono">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> đến <span className="font-bold text-gray-950 font-mono">{Math.min(indexOfLastItem, totalItems)}</span> trong tổng số <span className="font-bold text-blue-600 font-mono">{totalItems}</span> chi nhánh toàn hệ thống
            </div>

            <div className="inline-flex items-center space-x-1.5 self-end sm:self-auto">
              
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-0.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Trước</span>
              </button>

              <span className="px-3.5 text-[11px] font-black text-gray-800 font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-0.5"
              >
                <span>Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

            </div>

          </div>

        </div>
      </div>

      {/* ================= MODAL: THÊM CHI NHÁNH MỚI ================= */}
      {isAdding && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Xem xét cấp phép chi nhánh mới</h3>
                <p className="text-[10px] text-gray-400 mt-1">Đăng ký điểm bán hàng hợp pháp trong mạng lưới bán sỉ / lẻ</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewStoreSubmit} className="p-5 space-y-4 font-medium">
              
              {/* Branch Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Tên chi nhánh cửa hàng *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Chi nhánh Gò Vấp"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Manager Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ tên người Quản lý chi nhánh *</label>
                <input
                  type="text"
                  required
                  value={newManager}
                  onChange={(e) => setNewManager(e.target.value)}
                  placeholder="Ví dụ: Hoàng Minh Long"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại bàn / Hotline *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ví dụ: 02838999999"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Full Address */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ cụ thể *</label>
                <textarea
                  required
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Số nhà, Tên đường, Quận/Huyện, Thành phố..."
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 leading-relaxed font-semibold"
                  rows={2}
                />
              </div>

              {/* Baseline Revenue setup */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Doanh thu cơ sở mục tiêu (VND)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newBaselineRev}
                  onChange={(e) => setNewBaselineRev(Math.max(0, parseInt(e.target.value) || 0))}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Footer controls */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Chấp thuận thành lập
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: SỬA ĐỔI CHI NHÁNH DỮ LIỆU ================= */}
      {editingStore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Sửa đổi thông tin chi nhánh</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cập nhật vị trí đại lý hoặc trưởng phòng điều trị</p>
              </div>
              <button 
                onClick={() => setEditingStore(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditStoreSubmit} className="p-5 space-y-4 font-medium">
              
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Mã số cấp phép chi nhánh</span>
                <span className="font-extrabold text-[#3B82F6] font-mono text-xs">{editingStore.id}</span>
              </div>

              {/* Branch Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Tên chi nhánh *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Manager Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên Quản lý chi nhánh *</label>
                <input
                  type="text"
                  required
                  value={editManager}
                  onChange={(e) => setEditManager(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số Hotline bàn sỉ *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ giao dịch cụ thể *</label>
                <textarea
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold leading-relaxed"
                  rows={2}
                />
              </div>

              {/* Footer controls */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingStore(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Cập nhật ngay
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: XEM CHI TIẾT HOẠT ĐỘNG CHI NHÁNH ================= */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-50 text-[#3B82F6] rounded-xl">
                  <StoreIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                    Hồ sơ chi tiết &bull; {selectedStore.storeName}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                     Báo cáo quản lý chi tiết kết phối nhân sự, hoạt động POS, kiểm dịch kinh dịch hóa đơn
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStore(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile KPI Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 p-5 bg-gradient-to-r from-blue-50/20 to-slate-50 border-b border-gray-150/40 gap-4 text-xs">
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Người Đứng Đầu</span>
                <span className="font-extrabold text-gray-950 text-xs block mt-0.5">{selectedStore.managerName}</span>
                <span className="text-[10px] text-[#3B82F6] block">Giám đốc cửa hàng</span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Hotline Chi Nhánh</span>
                <span className="font-bold text-gray-900 font-mono block mt-1">{selectedStore.phone}</span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Trọng số Revenue</span>
                <span className="font-black text-emerald-700 font-mono block mt-1">
                  {formatVND(getBranchRevenue(selectedStore.id, selectedStore.storeName))}
                </span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Độ ngũ nhân viên</span>
                <span className="font-extrabold text-gray-750 block mt-1">
                  ⭐ <span className="font-mono text-purple-600 font-black">{getStaffCount(selectedStore.id)}</span> nhân sự
                </span>
              </div>
            </div>

            {/* Address bar item */}
            <div className="p-4 bg-orange-50/30 border-b border-gray-100 flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-gray-600 leading-relaxed font-semibold">
                Địa điểm cụ thể: <span className="text-gray-950 font-bold">{selectedStore.address}</span>
              </div>
            </div>

            {/* Double grid panels inside details modal */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[340px] overflow-y-auto">
              
              {/* Left Column: Staff members list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-[#3B82F6]" />
                    Nhân viên phục vụ ({getStoreStaffList(selectedStore.id).length})
                  </h4>
                  <span className="text-[10px] text-gray-400">POS & Kho</span>
                </div>

                <div className="space-y-2">
                  {getStoreStaffList(selectedStore.id).map(emp => (
                    <div key={emp.id} className="p-2.5 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900">{emp.name}</div>
                        <div className="text-[10px] text-gray-400">{emp.id} &bull; {emp.role}</div>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                        {emp.status}
                      </span>
                    </div>
                  ))}

                  {getStoreStaffList(selectedStore.id).length === 0 && (
                    <div className="py-6 text-center text-gray-400 text-[11px] italic">
                      Chi nhánh này chưa được phân bổ nhân sự trực tuyến.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Invoices issued at this branch */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center">
                    <ShoppingBag className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                    Lịch sử hóa đơn ({getStoreInvoices(selectedStore.storeName).length})
                  </h4>
                  <span className="text-[10px] text-gray-400">Doanh số POS</span>
                </div>

                <div className="space-y-2">
                  {getStoreInvoices(selectedStore.storeName).map(inv => (
                    <div key={inv.invoiceId} className="p-2.5 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between text-[11px]">
                      <div>
                        <div className="font-mono font-bold text-gray-950">{inv.invoiceId}</div>
                        <div className="text-[9px] text-gray-400">{inv.date} &bull; Thu ngân: {inv.staffName}</div>
                      </div>
                      
                      <div className="text-right">
                        <span className="block font-black text-slate-900 font-mono">{formatVND(inv.totalAmount)}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          inv.status === 'Hoàn thành' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {getStoreInvoices(selectedStore.storeName).length === 0 && (
                    <div className="py-6 text-center text-gray-400 text-[11px] italic">
                      Chưa có đơn hàng nào phát hành từ quầy thu ngân của chi nhánh này.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer triggers */}
            <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50/50">
              <button
                onClick={() => handleOpenEditStoreModal(selectedStore)}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-bold transition text-xs flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Hiệu chỉnh chi nhánh</span>
              </button>

              <button
                onClick={() => setSelectedStore(null)}
                className="px-5 py-2 bg-gray-950 hover:bg-gray-850 text-white rounded-lg font-bold transition shadow-xs text-xs"
              >
                Đóng hồ sơ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
