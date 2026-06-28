import { useState, useEffect, FormEvent } from 'react';
import {
  Search, Plus, MapPin, Phone, User, Store as StoreIcon,
  ChevronLeft, ChevronRight, X, Check, Users, DollarSign,
  Building2, Edit3, Info,
} from 'lucide-react';
import { getStores, createStore, updateStore, deactivateStore } from '../services/store.service';

interface ApiStore {
  id: string;
  storeName: string;
  address: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
}

interface StoreManagementProps {
  userRole?: string;
}

export default function StoreManagement({ userRole }: StoreManagementProps) {
  const isManager = userRole === 'Quản lý' || userRole === 'Manager';

  const [apiStores, setApiStores] = useState<ApiStore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [isAdding, setIsAdding] = useState(false);
  const [editingStore, setEditingStore] = useState<ApiStore | null>(null);
  const [selectedStore, setSelectedStore] = useState<ApiStore | null>(null);

  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStores();
      setApiStores(res.data);
    } catch {
      setError('Không thể tải danh sách chi nhánh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const filteredStores = apiStores.filter(store =>
    store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredStores.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredStores.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddNewStoreSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) {
      alert('Vui lòng điền tên và địa chỉ chi nhánh!');
      return;
    }
    try {
      await createStore({
        storeName: newName.trim(),
        address: newAddress.trim(),
        phone: newPhone.trim() || undefined,
      });
      await fetchStores();
      setNewName('');
      setNewAddress('');
      setNewPhone('');
      setIsAdding(false);
      showToast(`Đã thêm chi nhánh ${newName} thành công`);
    } catch {
      alert('Không thể thêm chi nhánh. Vui lòng thử lại!');
    }
  };

  const handleOpenEditStoreModal = (store: ApiStore) => {
    setEditingStore(store);
    setEditName(store.storeName);
    setEditAddress(store.address);
    setEditPhone(store.phone ?? '');
  };

  const handleSaveEditStoreSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStore) return;
    if (!editName.trim() || !editAddress.trim()) {
      alert('Vui lòng điền tên và địa chỉ!');
      return;
    }
    try {
      await updateStore(editingStore.id, {
        storeName: editName.trim(),
        address: editAddress.trim(),
        phone: editPhone.trim() || undefined,
      });
      await fetchStores();
      if (selectedStore?.id === editingStore.id) {
        setSelectedStore(prev =>
          prev ? { ...prev, storeName: editName.trim(), address: editAddress.trim(), phone: editPhone.trim() || null } : null
        );
      }
      setEditingStore(null);
      showToast(`Đã cập nhật chi nhánh ${editName} thành công`);
    } catch {
      alert('Không thể cập nhật chi nhánh. Vui lòng thử lại!');
    }
  };

  const handleDeactivateStore = async (id: string) => {
    if (!confirm('Bạn có chắc muốn vô hiệu hóa chi nhánh này?')) return;
    try {
      await deactivateStore(id);
      await fetchStores();
      showToast('Đã vô hiệu hóa chi nhánh');
    } catch {
      alert('Không thể vô hiệu hóa chi nhánh. Vui lòng thử lại!');
    }
  };

  const activeBranchCount = apiStores.length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="branch-page-title">
            Quản lý chi nhánh
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi mạng lưới kinh doanh chi nhánh và cơ cấu điều khiển chuỗi.
          </p>
        </div>
        {notification && (
          <div className="px-4 py-2 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">{error}</div>
      )}

      {/* Metric widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="branch-metrics-widgets">
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

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Tổng lực lượng nhân sự</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">0 nhân viên</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Xem chi tiết tại module Tài khoản</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Tổng doanh thu kết chuyển tháng</span>
            <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">—</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Xem chi tiết tại module Báo cáo</span>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên chi nhánh, mã, địa chỉ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {isManager && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs self-end sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chi nhánh</span>
          </button>
        )}
      </div>

      {loading && (
        <div className="py-8 text-center text-xs text-gray-400 font-semibold">Đang tải dữ liệu...</div>
      )}

      {/* Card grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="branch-cards-panel">
          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-3xs hover:shadow-2xs transition-all duration-250 overflow-hidden flex flex-col justify-between p-5 space-y-4 relative group"
            >
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

              <div className="space-y-2 text-xs text-gray-600">
                <p className="flex items-start">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-gray-500 font-medium">{store.address}</span>
                </p>
                <p className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <span>Quản lý: <span className="font-bold text-gray-800">—</span></span>
                </p>
                <p className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                  <span className="font-mono text-gray-500">{store.phone ?? '—'}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-100">
                  <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">Số nhân viên</span>
                  <span className="text-xs font-black text-gray-950 font-mono">0 nhân viên</span>
                </div>
                <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/40">
                  <span className="block text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Doanh thu tháng</span>
                  <span className="text-xs font-black text-gray-400 font-mono">—</span>
                </div>
              </div>

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
          ))}
        </div>
      )}

      {/* Table */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider mb-3">
          Danh sách chi tiết hệ thống chi nhánh
        </h3>

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
                  <th scope="col" className="px-5 py-3.5 text-right w-52">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150/40 text-xs text-gray-750">
                {currentItems.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold font-mono text-gray-950">{store.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-gray-950">{store.storeName}</div>
                      <div className="text-[10px] text-gray-400">QL: —</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-sm truncate" title={store.address}>
                      {store.address}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold font-mono bg-blue-50 text-[#3B82F6] border border-blue-100/50">
                        0
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">
                      <span className="font-extrabold text-gray-400 bg-gray-50 px-2.5 py-0.5 rounded border border-gray-200">
                        —
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        {isManager && (
                          <button
                            onClick={() => handleOpenEditStoreModal(store)}
                            className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-blue-50/10 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                            title="Sửa thông tin chi nhánh"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Sửa</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedStore(store)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                          title="Xem chi tiết"
                        >
                          <Info className="w-3 h-3" />
                          <span>Chi tiết</span>
                        </button>
                        {isManager && (
                          <button
                            onClick={() => handleDeactivateStore(store.id)}
                            className="px-2 py-1 text-[10px] font-extrabold border border-red-200 hover:border-red-400 hover:text-red-600 hover:bg-red-50 rounded bg-white text-red-400 transition flex items-center space-x-0.5"
                            title="Vô hiệu hóa chi nhánh"
                          >
                            <X className="w-3 h-3" />
                            <span>Vô hiệu hóa</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStores.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-400">
                      <StoreIcon className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-bounce" />
                      <p className="text-xs font-bold">Không tìm thấy chi nhánh nào trùng khớp!</p>
                      <p className="text-[10px] text-gray-400 mt-1">Vui lòng kiểm tra từ khoá tìm kiếm</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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

      {/* MODAL: THÊM CHI NHÁNH */}
      {isAdding && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Thêm chi nhánh mới</h3>
                <p className="text-[10px] text-gray-400 mt-1">Đăng ký điểm bán hàng mới trong mạng lưới chuỗi</p>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewStoreSubmit} className="p-5 space-y-4 font-medium">
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

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại / Hotline</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ví dụ: 02838999999"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

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
                  Thêm chi nhánh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SỬA CHI NHÁNH */}
      {editingStore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Sửa đổi thông tin chi nhánh</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cập nhật vị trí hoặc thông tin liên hệ</p>
              </div>
              <button
                onClick={() => setEditingStore(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditStoreSubmit} className="p-5 space-y-4 font-medium">
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Mã chi nhánh</span>
                <span className="font-extrabold text-[#3B82F6] font-mono text-xs">{editingStore.id}</span>
              </div>

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

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số Hotline</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ giao dịch *</label>
                <textarea
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold leading-relaxed"
                  rows={2}
                />
              </div>

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

      {/* MODAL: XEM CHI TIẾT */}
      {selectedStore && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
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
                    Thông tin chi nhánh và hoạt động
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

            <div className="grid grid-cols-2 sm:grid-cols-4 p-5 bg-gradient-to-r from-blue-50/20 to-slate-50 border-b border-gray-150/40 gap-4 text-xs">
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Người Đứng Đầu</span>
                <span className="font-extrabold text-gray-950 text-xs block mt-0.5">—</span>
                <span className="text-[10px] text-[#3B82F6] block">Giám đốc cửa hàng</span>
              </div>
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Hotline Chi Nhánh</span>
                <span className="font-bold text-gray-900 font-mono block mt-1">{selectedStore.phone ?? '—'}</span>
              </div>
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Doanh thu tháng</span>
                <span className="font-black text-gray-400 font-mono block mt-1">—</span>
              </div>
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Số nhân viên</span>
                <span className="font-extrabold text-gray-750 block mt-1">
                  <span className="font-mono text-purple-600 font-black">0</span> nhân sự
                </span>
              </div>
            </div>

            <div className="p-4 bg-orange-50/30 border-b border-gray-100 flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div className="text-gray-600 leading-relaxed font-semibold">
                Địa điểm cụ thể: <span className="text-gray-950 font-bold">{selectedStore.address}</span>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-between bg-gray-50/50">
              {isManager && (
                <button
                  onClick={() => { setSelectedStore(null); handleOpenEditStoreModal(selectedStore); }}
                  className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-bold transition text-xs flex items-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Hiệu chỉnh chi nhánh</span>
                </button>
              )}
              <button
                onClick={() => setSelectedStore(null)}
                className="px-5 py-2 bg-gray-950 hover:bg-gray-850 text-white rounded-lg font-bold transition shadow-xs text-xs ml-auto"
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
