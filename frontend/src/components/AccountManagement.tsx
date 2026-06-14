import { useState, FormEvent, useEffect } from 'react';
import { Store, Employee, ApiAccount, ApiStore } from '../types';
import { roleLabels, roleLabelToEnum } from '../utils/roleMapping';
import {
  Search,
  Plus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Mail,
  ShieldAlert,
  Key,
  Building2,
  ToggleLeft,
  ToggleRight,
  Edit3,
  UserCheck,
  Power,
  Eye,
  EyeOff,
  Lock,
  AlertCircle
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

interface AccountManagementProps {
  employees: Employee[];
  stores: Store[];
}

export default function AccountManagement({ employees: _employees, stores: _stores }: AccountManagementProps) {
  // API data
  const [apiStores, setApiStores] = useState<ApiStore[]>([]);
  const [apiAccounts, setApiAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Tất cả' | 'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý'>('Tất cả');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('Tất cả');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isCreating, setIsCreating] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ApiAccount | null>(null);

  // Create form
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formRole, setFormRole] = useState<'Staff' | 'WarehouseStaff' | 'Manager'>('Staff');
  const [formStoreId, setFormStoreId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editStoreId, setEditStoreId] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch stores + accounts in parallel on mount
  const fetchData = async () => {
    setIsLoading(true);
    setFetchError('');
    const token = getToken();
    try {
      const [storesRes, accountsRes] = await Promise.all([
        fetch(`${API_BASE}/stores`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/accounts`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!storesRes.ok || !accountsRes.ok) throw new Error('Lỗi tải dữ liệu');
      const [storesData, accountsData]: [ApiStore[], ApiAccount[]] = await Promise.all([
        storesRes.json(),
        accountsRes.json(),
      ]);
      setApiStores(storesData);
      setApiAccounts(accountsData);
      setFormStoreId(storesData[0]?.id || '');
    } catch {
      setFetchError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Reset page on filter/search change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedRole, selectedStoreId]);

  // Filtered accounts
  const filteredAccounts = apiAccounts.filter(acc => {
    const matchesSearch =
      acc.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      selectedRole === 'Tất cả' ||
      acc.role === roleLabelToEnum[selectedRole as 'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho'];
    const matchesStore = selectedStoreId === 'Tất cả' || acc.storeId === selectedStoreId;
    return matchesSearch && matchesRole && matchesStore;
  });

  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAccounts.slice(indexOfFirstItem, indexOfLastItem);

  const resetCreateForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setShowFormPassword(false);
    setFormRole('Staff');
    setFormStoreId(apiStores[0]?.id || '');
    setFormPhone('');
    setFormSalary('');
    setFormError('');
  };

  // Create account
  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formEmail.trim() || !formPassword) {
      setFormError('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if ((formRole === 'Staff' || formRole === 'WarehouseStaff') && !formStoreId) {
      setFormError('Vui lòng chọn chi nhánh cho vai trò này.');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const body: Record<string, unknown> = {
        fullName: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        password: formPassword,
        role: formRole,
        storeId: formStoreId || null,
        phone: formPhone.trim() || null,
      };
      if (formSalary !== '') body.salary = parseFloat(formSalary);

      const res = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.message || 'Đã có lỗi xảy ra'); return; }

      setApiAccounts(prev => [data as ApiAccount, ...prev]);
      setIsCreating(false);
      resetCreateForm();
      showToast(`Đã khởi tạo thành công tài khoản cho ${(data as ApiAccount).fullName}`);
    } catch {
      setFormError('Không thể kết nối đến server');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Open edit modal
  const handleOpenEdit = (acc: ApiAccount) => {
    setEditingAccount(acc);
    setEditName(acc.fullName);
    setEditStoreId(acc.storeId || '');
    setEditSalary(acc.salary !== null ? String(acc.salary) : '');
    setEditIsActive(acc.isActive);
    setEditError('');
  };

  // Save edit
  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editName.trim()) { setEditError('Họ tên không được để trống.'); return; }

    setIsSubmittingEdit(true);
    setEditError('');
    try {
      const body: Record<string, unknown> = {
        fullName: editName.trim(),
        storeId: editStoreId || null,
        isActive: editIsActive,
      };
      if (editSalary !== '') body.salary = parseFloat(editSalary);

      const res = await fetch(`${API_BASE}/accounts/${editingAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setEditError((data as { message?: string }).message || 'Đã có lỗi xảy ra'); return; }

      setApiAccounts(prev => prev.map(a => a.id === (data as ApiAccount).id ? data as ApiAccount : a));
      setEditingAccount(null);
      showToast(`Đã cập nhật tài khoản của ${(data as ApiAccount).fullName}`);
    } catch {
      setEditError('Không thể kết nối đến server');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Toggle isActive directly from table row
  const toggleAccountStatus = async (acc: ApiAccount) => {
    try {
      const res = await fetch(`${API_BASE}/accounts/${acc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ isActive: !acc.isActive }),
      });
      if (!res.ok) { const d = await res.json(); showToast(`Lỗi: ${(d as { message?: string }).message || 'Không thể cập nhật'}`); return; }
      const updated = await res.json() as ApiAccount;
      setApiAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
      showToast(`Đã ${updated.isActive ? 'KÍCH HOẠT' : 'VÔ HIỆU HÓA'} tài khoản ${updated.fullName}`);
    } catch {
      showToast('Không thể kết nối đến server');
    }
  };

  const formatDate = (iso: string) => iso.slice(0, 10);

  // Loading & error screens
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <Shield className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-pulse" />
          <p className="text-xs font-bold">Đang tải dữ liệu tài khoản...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldAlert className="w-8 h-8 text-red-300 mx-auto stroke-1 mb-2" />
          <p className="text-xs font-bold text-red-500">{fetchError}</p>
          <button onClick={fetchData} className="mt-3 text-xs text-[#3B82F6] underline font-semibold">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="account-page-title">
            Quản lý tài khoản & phân quyền
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Thiết lập vai trò, cấp quyền hệ thống cho nhân viên bán hàng và nhân viên kho theo vị trí chi nhánh đại lý.
          </p>
        </div>

        {toastMessage && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs transition-transform duration-200">
            <Check className="w-4 h-4 text-[#3B82F6]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="account-quick-stats">

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-lg"><Shield className="w-4 h-4" /></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Toàn bộ Tài khoản</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">{apiAccounts.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><UserCheck className="w-4 h-4" /></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Đang hoạt động</span>
            <span className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5 block">
              {apiAccounts.filter(a => a.isActive).length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Key className="w-4 h-4" /></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Nhân viên bán hàng</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">
              {apiAccounts.filter(a => a.role === 'Staff').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><ShieldAlert className="w-4 h-4" /></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Nhân viên quản mìn kho</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">
              {apiAccounts.filter(a => a.role === 'WarehouseStaff').length}
            </span>
          </div>
        </div>

      </div>

      {/* 3. SEARCH & FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        <div className="flex-1 max-w-sm relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email tài khoản / nhân sự..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline mr-1">Vai trò:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as typeof selectedRole)}
              className="bg-white border border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Tất cả">Tất cả vai trò</option>
              <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
              <option value="Nhân viên kho">Nhân viên kho</option>
              <option value="Quản lý">Quản lý hệ thống</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline mr-1">Chi nhánh:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Tất cả">Tất cả chi nhánh</option>
              {apiStores.map(store => (
                <option key={store.id} value={store.id}>{store.storeName}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-1 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs ml-auto lg:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo tài khoản</span>
          </button>

        </div>
      </div>

      {/* 4. TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs font-medium">
          <table className="w-full text-left text-gray-600 border-collapse">

            <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-5 py-3.5">Họ tên nhân viên</th>
                <th scope="col" className="px-5 py-3.5">Email liên hệ</th>
                <th scope="col" className="px-5 py-3.5">Vai trò hệ thống</th>
                <th scope="col" className="px-5 py-3.5">Bố trí chi nhánh</th>
                <th scope="col" className="px-5 py-3.5 text-center">Ngày tạo</th>
                <th scope="col" className="px-5 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-5 py-3.5 text-right w-52">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-150/40 text-xs text-gray-750">
              {currentItems.map((acc) => {
                const connectedBranch = apiStores.find(s => s.id === acc.storeId)?.storeName || (acc.storeId ? acc.storeId : '—');

                return (
                  <tr key={acc.id} className="hover:bg-gray-50/25 transition-colors">

                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-[11px]">
                          {acc.fullName.split(' ').pop()?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="font-extrabold text-gray-950 block">{acc.fullName}</span>
                          <span className="text-[10px] text-gray-400 font-mono font-bold">{acc.id.slice(0, 8)}…</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-gray-500">{acc.email}</td>

                    <td className="px-5 py-3.5">
                      {acc.role === 'Staff' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-[#3B82F6] border border-blue-250">
                          Nhân viên bán hàng
                        </span>
                      )}
                      {acc.role === 'WarehouseStaff' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                          Nhân viên kho
                        </span>
                      )}
                      {acc.role === 'Manager' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-250">
                          Quản lý hệ thống
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-gray-650">
                      <div className="flex items-center space-x-1.5 font-semibold text-gray-650">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{connectedBranch}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono text-gray-500">
                      {formatDate(acc.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {acc.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                          Vô hiệu hóa
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-blue-50/10 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                          title="Sửa thông tin"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>

                        <button
                          onClick={() => toggleAccountStatus(acc)}
                          className={`px-2 py-1 text-[10px] font-extrabold border rounded transition flex items-center space-x-0.5 ${
                            acc.isActive
                              ? 'border-gray-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/20 text-gray-700 bg-white'
                              : 'border-emerald-200 hover:border-emerald-400 text-emerald-700 bg-emerald-50/20'
                          }`}
                          title={acc.isActive ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt tài khoản'}
                        >
                          <Power className="w-3 h-3" />
                          <span>{acc.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <ShieldAlert className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2" />
                    <p className="text-xs font-bold">Không tìm thấy tài khoản nào khớp tiêu chuẩn lọc!</p>
                    <p className="text-[10px] text-gray-400 mt-1">Vui lòng thay đổi từ khóa gõ hoặc thử điều chỉnh các bộ lọc</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION */}
        <div className="bg-gray-50/60 px-5 py-3.5 border-t border-gray-150/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="text-gray-500 font-medium">
            Hiển thị <span className="font-bold text-gray-950 font-mono">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> đến <span className="font-bold text-gray-950 font-mono">{Math.min(indexOfLastItem, totalItems)}</span> trong tổng số <span className="font-bold text-blue-600 font-mono">{totalItems}</span> tài khoản vận hành
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
            <span className="px-3.5 text-[11px] font-black text-gray-850 font-mono">{currentPage} / {totalPages}</span>
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

      {/* ===== MODAL: TẠO TÀI KHOẢN MỚI ===== */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-xs font-semibold animate-scaleIn">

            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                  <Key className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                  Cấp tài khoản & mã khóa nhân viên
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Đăng ký quyền truy cập ban ngành POS và Quản lý kho hàng</p>
              </div>
              <button onClick={() => { setIsCreating(false); resetCreateForm(); }} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4 font-medium max-h-[75vh] overflow-y-auto">

              {/* Họ tên */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên nhân viên *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-3.5 w-3.5 text-gray-450" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Thế Nam"
                    className="block w-full border border-gray-300 rounded-lg p-2 pl-9 bg-white text-gray-950 font-bold"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ Email đăng nhập *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-3.5 w-3.5 text-gray-450" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ví dụ: namnt@retailchain.vn"
                    className="block w-full border border-gray-300 rounded-lg p-2 pl-9 bg-white text-gray-950 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Mật khẩu */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Mật khẩu *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-gray-450" />
                  </div>
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="block w-full border border-gray-300 rounded-lg p-2 pl-9 pr-9 bg-white text-gray-950 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Vai trò */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Vai trò / Phân quyền ứng dụng</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as typeof formRole)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  <option value="Staff">Nhân viên bán hàng (Quyền hạn POS, Tra cứu khách)</option>
                  <option value="WarehouseStaff">Nhân viên kho (Quyền hạn Nhập, Xuất, Tồn hàng, Điều chuyển)</option>
                  <option value="Manager">Quản lý hệ thống (Toàn bộ quyền lực điều khiển)</option>
                </select>
              </div>

              {/* Chi nhánh */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">
                  Trụ sở đóng quân (Chi nhánh phụ trách){formRole !== 'Manager' && ' *'}
                </label>
                <select
                  value={formStoreId}
                  onChange={(e) => setFormStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  {formRole === 'Manager' && <option value="">Không phân công chi nhánh cụ thể</option>}
                  {apiStores.map(store => (
                    <option key={store.id} value={store.id}>{store.storeName}</option>
                  ))}
                </select>
              </div>

              {/* Số điện thoại (optional) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại (tùy chọn)</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Lương (optional) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Lương (tùy chọn, VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  value={formSalary}
                  onChange={(e) => setFormSalary(e.target.value)}
                  placeholder="Ví dụ: 8000000"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Form error */}
              {formError && (
                <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => { setIsCreating(false); resetCreateForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmittingCreate ? 'Đang tạo...' : 'Khởi tạo tài khoản'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: CHỈNH SỬA TÀI KHOẢN ===== */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-xs font-semibold animate-scaleIn">

            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                  <Edit3 className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                  Thay đổi quyền / Thông tin tài khoản
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Thiết thực tái điều chuyển nhân sự sang chi nhánh mới</p>
              </div>
              <button onClick={() => setEditingAccount(null)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 font-medium">

              {/* Email + ID (read-only) */}
              <div className="p-3.5 bg-gray-50 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="block text-[8px] text-gray-400 uppercase font-black">Địa chỉ Email (Không được đổi)</span>
                  <span className="font-semibold text-gray-800 font-mono">{editingAccount.email}</span>
                </div>
                <span className="font-extrabold text-[#3B82F6] font-mono text-[10px] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {editingAccount.id.slice(0, 8)}…
                </span>
              </div>

              {/* Họ tên */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên nhân viên *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Vai trò (read-only) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Vai trò / Phân quyền hệ thống</label>
                <div className="block w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-700 font-bold">
                  {roleLabels[editingAccount.role]}
                </div>
              </div>

              {/* Chi nhánh */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Chi nhánh phụ trách</label>
                <select
                  value={editStoreId}
                  onChange={(e) => setEditStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  <option value="">Không phân công chi nhánh cụ thể</option>
                  {apiStores.map(store => (
                    <option key={store.id} value={store.id}>{store.storeName}</option>
                  ))}
                </select>
              </div>

              {/* Lương */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Lương (VNĐ, tùy chọn)</label>
                <input
                  type="number"
                  min="0"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="Để trống nếu không áp dụng"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Trạng thái isActive */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Trạng thái tài khoản</label>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg border font-bold text-xs transition ${
                    editIsActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-gray-100 text-gray-500'
                  }`}
                >
                  {editIsActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{editIsActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</span>
                </button>
              </div>

              {/* Edit error */}
              {editError && (
                <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-semibold">{editError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
