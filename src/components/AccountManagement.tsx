import { useState, FormEvent, useEffect } from 'react';
import { Store, Employee } from '../types';
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
  Calendar, 
  ToggleLeft, 
  ToggleRight, 
  Edit3,
  Filter,
  UserCheck,
  Power
} from 'lucide-react';

interface AccountManagementProps {
  employees: Employee[];
  stores: Store[];
}

export interface UserAccount {
  id: string; // matches employee ID
  name: string;
  email: string;
  role: 'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý';
  storeId: string;
  createdAt: string;
  status: 'Đang hoạt động' | 'Vô hiệu hóa';
}

const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'NV001',
    name: 'Nguyễn Văn A',
    email: 'manager@retailchain.vn',
    role: 'Quản lý',
    storeId: 'CH001',
    createdAt: '2025-01-10',
    status: 'Đang hoạt động'
  },
  {
    id: 'NV002',
    name: 'Trần Thị B',
    email: 'staff@retailchain.vn',
    role: 'Nhân viên bán hàng',
    storeId: 'CH001',
    createdAt: '2025-02-15',
    status: 'Đang hoạt động'
  },
  {
    id: 'NV003',
    name: 'Trần Văn B',
    email: 'warehouse@retailchain.vn',
    role: 'Nhân viên kho',
    storeId: 'CH001',
    createdAt: '2025-03-01',
    status: 'Đang hoạt động'
  },
  {
    id: 'NV004',
    name: 'Phạm Minh D',
    email: 'nv004@retailchain.vn',
    role: 'Nhân viên bán hàng',
    storeId: 'CH002',
    createdAt: '2025-03-24',
    status: 'Đang hoạt động'
  },
  {
    id: 'NV005',
    name: 'Hoàng Thị E',
    email: 'nv005@retailchain.vn',
    role: 'Nhân viên kho',
    storeId: 'CH002',
    createdAt: '2025-04-12',
    status: 'Vô hiệu hóa'
  },
  {
    id: 'NV006',
    name: 'Trịnh Quốc F',
    email: 'nv006@retailchain.vn',
    role: 'Nhân viên bán hàng',
    storeId: 'CH003',
    createdAt: '2025-04-29',
    status: 'Đang hoạt động'
  }
];

export default function AccountManagement({ employees, stores }: AccountManagementProps) {
  const [accounts, setAccounts] = useState<UserAccount[]>(INITIAL_ACCOUNTS);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Custom filter states
  const [selectedRole, setSelectedRole] = useState<'Tất cả' | 'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý'>('Tất cả');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('Tất cả');

  // Pagination bounds
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isCreating, setIsCreating] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

  // Dynamic form state for ADDING
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý'>('Nhân viên bán hàng');
  const [formStoreId, setFormStoreId] = useState('CH001');

  // Dynamic form state for EDITING
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý'>('Nhân viên bán hàng');
  const [editStoreId, setEditStoreId] = useState('CH001');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = selectedRole === 'Tất cả' || acc.role === selectedRole;
    const matchesStore = selectedStoreId === 'Tất cả' || acc.storeId === selectedStoreId;

    return matchesSearch && matchesRole && matchesStore;
  });

  // Calculate pagination parameters
  const totalItems = filteredAccounts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAccounts.slice(indexOfFirstItem, indexOfLastItem);

  // Reset page layout on search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedRole, selectedStoreId]);

  // Handle adding account
  const handleCreateAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      alert('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    // Basic email validation
    if (!formEmail.includes('@')) {
      alert('Định dạng email không hợp lệ!');
      return;
    }

    const nextIdNum = Math.max(...accounts.map(a => parseInt(a.id.replace('NV', '')))) + 1;
    const newId = `NV${String(nextIdNum).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const newAcc: UserAccount = {
      id: newId,
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      role: formRole,
      storeId: formStoreId,
      createdAt: today,
      status: 'Đang hoạt động'
    };

    setAccounts([newAcc, ...accounts]);
    setIsCreating(false);
    
    // Reset inputs
    setFormName('');
    setFormEmail('');
    setFormRole('Nhân viên bán hàng');
    setFormStoreId(stores[0]?.id || 'CH001');

    showToast(`Đã khởi tạo thành công tài khoản cho ${newAcc.name}`);
  };

  // Open Edit Dialog
  const handleOpenEdit = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditRole(acc.role);
    setEditStoreId(acc.storeId);
  };

  // Handle Save Edit
  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!editName.trim()) {
      alert('Họ tên không được để trống.');
      return;
    }

    const updated = accounts.map(a => {
      if (a.id === editingAccount.id) {
        return {
          ...a,
          name: editName.trim(),
          role: editRole,
          storeId: editStoreId
        };
      }
      return a;
    });

    setAccounts(updated);
    setEditingAccount(null);
    showToast(`Đã cập nhật phân quyền tài khoản của ${editName}`);
  };

  // Toggle account Active status (Vô hiệu hóa <-- bực / kích hoạt)
  const toggleAccountStatus = (id: string, name: string, currentStatus: 'Đang hoạt động' | 'Vô hiệu hóa') => {
    const nextStatus = currentStatus === 'Đang hoạt động' ? 'Vô hiệu hóa' : 'Đang hoạt động';
    
    setAccounts(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: nextStatus };
      }
      return a;
    }));

    showToast(`Đã ${nextStatus === 'Vô hiệu hóa' ? 'VÔ HIỆU HÓA' : 'KÍCH HOẠT'} tài khoản ${name}`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. HEADER SECTION & ALERTS */}
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

      {/* 2. DYNAMIC SYSTEM CONTEXT INFO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="account-quick-stats">
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-lg">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Toàn bộ Tài khoản</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">{accounts.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Đang hoạt động</span>
            <span className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5 block">
              {accounts.filter(a => a.status === 'Đang hoạt động').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Nhân viên bán hàng</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">
              {accounts.filter(a => a.role === 'Nhân viên bán hàng').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Nhân viên quản mìn kho</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">
              {accounts.filter(a => a.role === 'Nhân viên kho').length}
            </span>
          </div>
        </div>

      </div>

      {/* 3. SEARCH & FILTERS CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Real-time search by name, email */}
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

        {/* Filters and CTA Button */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dropdown 1: Vai trò */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline mr-1">Vai trò:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="bg-white border border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Tất cả">Tất cả vai trò</option>
              <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
              <option value="Nhân viên kho">Nhân viên kho</option>
              <option value="Quản lý">Quản lý hệ thống</option>
            </select>
          </div>

          {/* Dropdown 2: Chi nhánh */}
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline mr-1">Chi nhánh:</span>
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="Tất cả">Tất cả chi nhánh</option>
              {stores.map(store => (
                <option key={store.id} value={store.id}>{store.storeName}</option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-1 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs ml-auto lg:ml-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo tài khoản</span>
          </button>

        </div>

      </div>

      {/* 4. DATA TABLE ELEMENT */}
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
                const connectedBranch = stores.find(s => s.id === acc.storeId)?.storeName || acc.storeId;
                
                return (
                  <tr key={acc.id} className="hover:bg-gray-50/25 transition-colors">
                    
                    {/* Họ tên */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-extrabold text-[11px]">
                          {acc.name.split(' ').pop()?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <span className="font-extrabold text-gray-950 block">{acc.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono font-bold">{acc.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-3.5 font-mono text-gray-500">
                      {acc.email}
                    </td>

                    {/* Vai trò */}
                    <td className="px-5 py-3.5">
                      {acc.role === 'Nhân viên bán hàng' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-[#3B82F6] border border-blue-250">
                          Nhân viên bán hàng
                        </span>
                      )}
                      {acc.role === 'Nhân viên kho' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">
                          Nhân viên kho
                        </span>
                      )}
                      {acc.role === 'Quản lý' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-250">
                          Quản lý hệ thống
                        </span>
                      )}
                    </td>

                    {/* Chi nhánh */}
                    <td className="px-5 py-3.5 text-gray-650">
                      <div className="flex items-center space-x-1.5 font-semibold text-gray-650">
                        <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{connectedBranch}</span>
                      </div>
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-5 py-3.5 text-center font-mono text-gray-500">
                      {acc.createdAt}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-5 py-3.5 text-center">
                      {acc.status === 'Đang hoạt động' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-150">
                          Đang hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                          Vô hiệu hóa
                        </span>
                      )}
                    </td>

                    {/* Hành động */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] hover:bg-blue-50/10 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                          title="Sửa phân quyền"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>

                        <button
                          onClick={() => toggleAccountStatus(acc.id, acc.name, acc.status)}
                          className={`px-2 py-1 text-[10px] font-extrabold border rounded transition flex items-center space-x-0.5 ${
                            acc.status === 'Đang hoạt động'
                              ? 'border-gray-200 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/20 text-gray-700 bg-white'
                              : 'border-emerald-200 hover:border-emerald-400 text-emerald-700 bg-emerald-50/20'
                          }`}
                          title={acc.status === 'Đang hoạt động' ? "Vô hiệu hóa tài khoản" : "Kích hoạt tài khoản"}
                        >
                          <Power className="w-3 h-3" />
                          <span>{acc.status === 'Đang hoạt động' ? 'Vô hiệu hóa' : 'Kích hoạt'}</span>
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

        {/* 5. TABLE PAGINATION FEET FOOTER */}
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

            <span className="px-3.5 text-[11px] font-black text-gray-850 font-mono">
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

      {/* ================= MODAL: THÀNH LẬP TÀI KHOẢN MỚI ================= */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-xs font-semibold animate-scaleIn">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                  <Key className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                  Cấp tài khoản & mã khóa nhân viên
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Đăng ký quyền truy cập ban ngành POS và Quản lý kho hàng</p>
              </div>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAccount} className="p-5 space-y-4 font-medium">
              
              {/* Name input */}
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

              {/* Email input */}
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

              {/* Role selection dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Vai trò / Phân quyền ứng dụng</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  <option value="Nhân viên bán hàng">Nhân viên bán hàng (Quyền hạn POS, Tra cứu khách)</option>
                  <option value="Nhân viên kho">Nhân viên kho (Quyền hạn Nhập, Xuất, Tồn hàng, Điều chuyển)</option>
                  <option value="Quản lý">Quản lý hệ thống (Toàn bộ quyền lực điều khiển)</option>
                </select>
              </div>

              {/* Assigned Store selection */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Trụ sở đóng quân (Chi nhánh phụ trách)</label>
                <select
                  value={formStoreId}
                  onChange={(e) => setFormStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.storeName} ({store.id})</option>
                  ))}
                </select>
              </div>

              {/* Bottom CTAs */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Khởi tạo tài khoản
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: HIỆU CHỈNH PHÂN QUYỀN TÀI KHOẢN ================= */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-xs font-semibold animate-scaleIn">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                  <Edit3 className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                  Thay đổi quyền / Thông tin tài khoản
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Thiết thực tái điều chuyển nhân sự sang chi nhánh mới</p>
              </div>
              <button 
                onClick={() => setEditingAccount(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 font-medium">
              
              <div className="p-3.5 bg-gray-50 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="block text-[8px] text-gray-400 uppercase font-black">Địa chỉ Email (Không được đổi)</span>
                  <span className="font-semibold text-gray-800 font-mono">{editingAccount.email}</span>
                </div>
                <span className="font-extrabold text-[#3B82F6] font-mono text-[10px] bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                  {editingAccount.id}
                </span>
              </div>

              {/* Name input */}
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

              {/* Role selection dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Vai trò / Phân quyền hệ thống</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
                  <option value="Nhân viên kho">Nhân viên kho</option>
                  <option value="Quản lý">Quản lý hệ thống</option>
                </select>
              </div>

              {/* Assigned Store selection */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Chi nhánh phụ trách</label>
                <select
                  value={editStoreId}
                  onChange={(e) => setEditStoreId(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold outline-none"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.storeName} ({store.id})</option>
                  ))}
                </select>
              </div>

              {/* Bottom CTAs */}
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
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Lưu thay đổi
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
