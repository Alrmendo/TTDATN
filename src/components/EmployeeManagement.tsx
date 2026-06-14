import { useState, FormEvent } from 'react';
import { Employee, Store } from '../types';
import { 
  Search, 
  Plus, 
  Filter, 
  User, 
  Store as StoreIcon, 
  Mail, 
  Phone, 
  Edit, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  X, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';

interface EmployeeManagementProps {
  employees: Employee[];
  stores: Store[];
  onAddEmployee: (e: Employee) => void;
  onUpdateEmployee: (e: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

export default function EmployeeManagement({ 
  employees, 
  stores, 
  onAddEmployee, 
  onUpdateEmployee, 
  onDeleteEmployee 
}: EmployeeManagementProps) {
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState('Tất cả');

  // Modal active states
  const [isAdding, setIsAdding] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form input states for Add/Edit
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Nhân viên bán hàng');
  const [storeId, setStoreId] = useState(stores[0]?.id || 'CH001');
  const [status, setStatus] = useState('Đang hoạt động');

  // Notification Banner
  const [notification, setNotification] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const triggerNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map branch selector from Store Name or Store ID
    const matchesStore = selectedStore === 'Tất cả' || emp.storeId === selectedStore;
    return matchesSearch && matchesStore;
  });

  const getStoreName = (id: string) => {
    return stores.find(s => s.id === id)?.storeName || 'Chi nhánh lưu động';
  };

  // Open Add modal with default fields
  const handleOpenAddModal = () => {
    setName('');
    setEmail('');
    setPhone('');
    setRole('Nhân viên bán hàng');
    setStoreId(stores[0]?.id || 'CH001');
    setStatus('Đang hoạt động');
    setIsAdding(true);
  };

  // Handle addition of a new staff member
  const handleCreateEmployee = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Vui lòng điền đầy đủ thông tin bắt buộc (Họ tên, Email)!');
      return;
    }

    // Auto calculate unique employee ID
    const numberPart = employees.length > 0 
      ? Math.max(...employees.map(emp => parseInt(emp.id.replace(/\D/g, '')) || 0)) + 1 
      : 1;
    const newId = `NV${String(numberPart).padStart(3, '0')}`;

    const newStaff: Employee = {
      id: newId,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      storeId,
      status: status === 'Đang hoạt động' ? 'Đang làm việc' : 'Vô hiệu hóa'
    };

    onAddEmployee(newStaff);
    setIsAdding(false);
    triggerNotification(`Đã thêm thành công nhân sự mới: ${newStaff.name} (${newId})`);
  };

  // Open Edit Modal with prefilled fields
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setEmail(emp.email);
    setPhone(emp.phone);
    setRole(emp.role);
    setStoreId(emp.storeId);
    setStatus(emp.status === 'Đang làm việc' || emp.status === 'Đang hoạt động' ? 'Đang hoạt động' : 'Vô hiệu hóa');
  };

  // Submit edit employee update
  const handleSaveEditEmployee = (e: FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!name.trim() || !email.trim()) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc!');
      return;
    }

    const updatedStaff: Employee = {
      ...editingEmployee,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      storeId,
      status: status === 'Đang hoạt động' ? 'Đang làm việc' : 'Vô hiệu hóa'
    };

    onUpdateEmployee(updatedStaff);
    setEditingEmployee(null);
    triggerNotification(`Đã cập nhật thông tin nhân sự ${updatedStaff.id} thành công.`);
  };

  // Toggle status of employee directly
  const handleToggleStatus = (emp: Employee) => {
    const isCurrentlyActive = emp.status === 'Đang làm việc' || emp.status === 'Đang hoạt động';
    const nextStatus = isCurrentlyActive ? 'Vô hiệu hóa' : 'Đang làm việc';
    const msg = isCurrentlyActive 
      ? `Bạn có chắc muốn vô hiệu hóa tài khoản của nhân viên ${emp.name} (${emp.id})?`
      : `Kích hoạt lại tài khoản cho nhân viên ${emp.name} (${emp.id})?`;

    if (confirm(msg)) {
      onUpdateEmployee({
        ...emp,
        status: nextStatus
      });
      triggerNotification(
        isCurrentlyActive 
          ? `Đã vô hiệu hóa tài khoản của nhân viên ${emp.name}` 
          : `Đã kích hoạt lại tài khoản của nhân viên ${emp.name}`,
        isCurrentlyActive ? 'info' : 'success'
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Heading Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="emp-page-title">Quản lý nhân viên</h2>
          <p className="text-xs text-gray-500 mt-1">Quản trị danh sách nhân sự hành chính, phân vai chi nhánh, kích hoạt và vô hiệu hóa tài khoản đăng nhập</p>
        </div>

        {/* Action success alert floating panel */}
        {notification && (
          <div className={`p-2.5 px-4 rounded-lg flex items-center space-x-2 text-xs font-semibold animate-fadeIn border ${
            notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* Top Action Bar matching user specs */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4" id="staff-action-bar">
        
        {/* Left Search Input */}
        <div className="flex-1 max-w-sm relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã nhân viên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition font-medium"
          />
        </div>

        {/* Right branch Filter & Blue Add Button */}
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          
          <div className="flex items-center space-x-1 border border-gray-300 rounded-lg bg-white px-2.5 py-1.5 text-xs text-gray-600 shadow-3xs">
            <Filter className="w-3.5 h-3.5 mr-1 text-gray-400" />
            <span className="text-gray-400 mr-1.5 font-bold">Chi nhánh:</span>
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="bg-transparent font-bold focus:outline-none text-gray-800 cursor-pointer text-xs"
            >
              <option value="Tất cả">Tất cả chi nhánh</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.storeName}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm nhân viên</span>
          </button>

        </div>

      </div>

      {/* Main Staff Registry Datatable */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden" id="staff-table-wrapper">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-5 py-3.5">Mã NV</th>
                <th scope="col" className="px-5 py-3.5">Họ tên</th>
                <th scope="col" className="px-5 py-3.5">Vai trò</th>
                <th scope="col" className="px-5 py-3.5">Chi nhánh</th>
                <th scope="col" className="px-5 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-5 py-3.5 text-right w-44">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150/40 font-medium text-gray-700">
              {filteredEmployees.map((emp) => {
                const isActive = emp.status === 'Đang làm việc' || emp.status === 'Đang hoạt động';
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/40 transition">
                    
                    {/* Mã NV */}
                    <td className="px-5 py-4 font-bold font-mono text-gray-950">{emp.id}</td>

                    {/* Họ tên & Contact details info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#3B82F6] font-bold flex items-center justify-center border border-blue-100 text-[11px] uppercase">
                          {emp.name.split(' ').slice(-1)[0]?.substring(0, 2) || 'NV'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-950 text-xs">{emp.name}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5 font-mono">{emp.email} &bull; {emp.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Vai trò row column */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                        emp.role === 'Quản lý'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : emp.role === 'Nhân viên bán hàng'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-250'
                      }`}>
                        {emp.role}
                      </span>
                    </td>

                    {/* Chi nhánh */}
                    <td className="px-5 py-4 text-xs font-bold text-gray-800">{getStoreName(emp.storeId)}</td>

                    {/* Trạng thái badges */}
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2 px-2.5 py-0.5 rounded-full text-[9.5px] font-black tracking-tight leading-normal uppercase select-none ${
                        isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-100 text-gray-400 border border-gray-200/80'
                      }`}>
                        {isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}
                      </span>
                    </td>

                    {/* Hành động sửa / vô hiệu hóa column */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="px-2.5 py-1 text-[10px] font-bold border border-gray-200 hover:border-blue-300 hover:text-[#3B82F6] rounded bg-white text-gray-600 transition flex items-center"
                          title="Sửa thông tin nhân viên"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          <span>Sửa</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded border transition flex items-center ${
                            isActive
                            ? 'bg-white border-rose-100 hover:border-red-400 text-red-600 hover:bg-rose-50/20'
                            : 'bg-white border-emerald-100 hover:border-emerald-400 text-emerald-600 hover:bg-emerald-50/20'
                          }`}
                          title={isActive ? "Vô hiệu hóa tài khoản" : "Kích hoạt tài khoản"}
                        >
                          {isActive ? <UserX className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                          <span>{isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400">
                    <div className="flex flex-col items-center space-y-2">
                      <User className="w-8 h-8 text-gray-300 stroke-1" />
                      <p className="text-xs font-bold">Không tìm thấy kết quả nhân sự nào phù hợp!</p>
                      <p className="text-[10px] text-gray-400">Vui lòng thay đổi từ khóa tìm kiếm hoặc lọc chi nhánh khác.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= ADD NEW EMPLOYEE DIALOG OVERLAY MODAL ================= */}
      {isAdding && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Modal header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">Thêm nhân viên mới</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Tạo tài khoản công tác cho nhân viên trực thuộc toàn chuỗi</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal submit form */}
            <form onSubmit={handleCreateEmployee} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@retailchain.vn"
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none"
                  />
                </div>

                {/* Telephone */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-mono"
                  />
                </div>

                {/* Branch affiliation */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Chi nhánh công tác</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-semibold"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </div>

                {/* Job Role Title */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Vai trò / Nhiệm vụ</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-semibold"
                  >
                    <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
                    <option value="Nhân viên kho">Nhân viên kho</option>
                    <option value="Quản lý">Quản lý (Manager)</option>
                  </select>
                </div>

                {/* Startup operational Status */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Trạng thái ban đầu</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-semibold text-emerald-700"
                  >
                    <option value="Đang hoạt động" className="text-emerald-700 font-bold">Đang hoạt động</option>
                    <option value="Vô hiệu hóa" className="text-gray-400">Vô hiệu hóa</option>
                  </select>
                </div>

              </div>

              {/* Action feet footer buttons modal */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
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
                  Lưu nhân viên
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= EDIT EMPLOYEE INFO OVERLAY MODAL ================= */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Modal header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">Hiệu chỉnh thông tin nhân viên</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Cập nhật hồ sơ nhân sự mã số <span className="font-bold text-[#3B82F6] font-mono">{editingEmployee.id}</span></p>
              </div>
              <button 
                onClick={() => setEditingEmployee(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal submit form */}
            <form onSubmit={handleSaveEditEmployee} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@retailchain.vn"
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:outline-none"
                  />
                </div>

                {/* Telephone */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxx"
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-mono"
                  />
                </div>

                {/* Branch affiliation */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Chi nhánh công tác</label>
                  <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-semibold"
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.storeName}</option>
                    ))}
                  </select>
                </div>

                {/* Job Role Title */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Vai trò / Nhiệm vụ</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-semibold"
                  >
                    <option value="Nhân viên bán hàng">Nhân viên bán hàng</option>
                    <option value="Nhân viên kho">Nhân viên kho</option>
                    <option value="Quản lý">Quản lý (Manager)</option>
                  </select>
                </div>

                {/* Status Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Trạng thái hoạt động</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={`block w-full border border-gray-300 rounded-lg p-2 bg-white font-semibold text-xs ${
                      status === 'Đang hoạt động' ? 'text-emerald-700' : 'text-gray-400'
                    }`}
                  >
                    <option value="Đang hoạt động" className="text-emerald-700">Đang hoạt động</option>
                    <option value="Vô hiệu hóa" className="text-gray-400">Vô hiệu hóa</option>
                  </select>
                </div>

              </div>

              {/* Action feet footer buttons modal */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition"
                >
                  Cập nhật hồ sơ
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
