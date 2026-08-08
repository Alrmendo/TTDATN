import { useState, useEffect, FormEvent } from 'react';
import { Customer, Invoice, ApiCustomer, ApiInvoice } from '../types';
import {
  Search,
  Plus,
  Star,
  History,
  Edit2,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  Phone,
  User,
  Calendar,
  TrendingUp,
  Award,
  DollarSign,
  Check,
  ShoppingBag,
  Eye,
  Printer,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { searchCustomers, createCustomer, updateCustomer } from '../services/customer.service';
import { API_BASE } from '../config/api';
import { downloadInvoicePdf } from '../utils/invoicePdf';

interface CustomerManagementProps {
  customers: Customer[];
  onAddCustomer: (c: Customer) => void;
  invoices?: Invoice[];
}

const mapTier = (memberLevel: string | null): Customer['tier'] => {
  if (memberLevel === 'Đồng' || memberLevel === 'Bạc' || memberLevel === 'Vàng' || memberLevel === 'Kim cương') {
    return memberLevel;
  }
  return 'Đồng';
};

export default function CustomerManagement({
  customers,
  onAddCustomer,
  invoices = []
}: CustomerManagementProps) {

  // Localized customers state, populated from the real API (not from props anymore)
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);

  const loadCustomers = async () => {
    try {
      const data: ApiCustomer[] = await searchCustomers();

      const mapped: Customer[] = data.map((c) => ({
        id: c.id,
        name: c.fullName,
        phone: c.phone,
        email: c.email ?? undefined,
        loyaltyPoints: c.loyaltyPoints?.points ?? 0,
        tier: mapTier(c.memberLevel),
        totalSpent: 0,
        joinDate: c.createdAt.split('T')[0],
      }));

      setLocalCustomers(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<'Tất cả' | 'Đồng' | 'Bạc' | 'Vàng' | 'Kim cương'>('Tất cả');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal control states
  const [isAdding, setIsAdding] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedHistoryCust, setSelectedHistoryCust] = useState<Customer | null>(null);

  // Form states for creating a customer
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Form states for editing a customer
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Toast / Notification banner
  const [notification, setNotification] = useState<string | null>(null);
  const [customerHistoryInvoices, setCustomerHistoryInvoices] = useState<ApiInvoice[]>([]);
  const [isLoadingCustomerHistory, setIsLoadingCustomerHistory] = useState(false);
  const [customerHistoryError, setCustomerHistoryError] = useState('');
  const [selectedHistoryInvoice, setSelectedHistoryInvoice] = useState<ApiInvoice | null>(null);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const formatDateTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  const getToken = () => localStorage.getItem('token');

  // ------------------ BUSINESS METRICS ------------------
  const totalCustomers = localCustomers.length;
  
  const totalLoyaltyPoints = localCustomers.reduce((acc, c) => acc + c.loyaltyPoints, 0);
  
  const diamondVipCount = localCustomers.filter(c => c.tier === 'Kim cương' || c.tier === 'Vàng').length;

  // ------------------ SEARCH & FILTER CODES ------------------
  const filteredCustomers = localCustomers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm) ||
      (c.id && c.id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTier = filterTier === 'Tất cả' || c.tier === filterTier;
    
    return matchesSearch && matchesTier;
  });

  // Calculate pages
  const totalFilteredCount = filteredCustomers.length;
  const totalPages = Math.ceil(totalFilteredCount / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);

  // Reset page to 1 upon filtering change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTier]);

  // ------------------ API HANDLERS ------------------
  
  const handleAddNewCustomerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) {
      alert('Vui lòng điền đủ họ tên và số điện thoại!');
      return;
    }

    const registeredName = newName.trim();

    try {
      await createCustomer({
        fullName: registeredName,
        phone: newPhone.trim(),
        email: newEmail.trim() || undefined,
      });

      await loadCustomers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Đăng ký khách hàng thất bại');
      return;
    }

    // reset form fields
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setIsAdding(false);

    showToast(`Đăng ký thành viên ${registeredName} thành công!`);
  };

  const handleOpenEditCustomerModal = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditEmail(c.email || '');
  };

  const handleSaveEditCustomerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    if (!editName.trim() || !editPhone.trim()) {
      alert('Vui lòng cung cấp họ tên và số điện thoại');
      return;
    }

    try {
      await updateCustomer(editingCustomer.id, {
        fullName: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || undefined,
      });

      await loadCustomers();
      setEditingCustomer(null);
      showToast(`Đã lưu cập nhật thông tin khách hàng ${editName.trim()} thành công!`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cập nhật khách hàng thất bại');
    }
  };

  const loadCustomerHistory = async (customer: Customer) => {
    setSelectedHistoryCust(customer);
    setCustomerHistoryInvoices([]);
    setCustomerHistoryError('');
    setSelectedHistoryInvoice(null);
    setIsLoadingCustomerHistory(true);

    try {
      const res = await fetch(`${API_BASE}/invoices?customerId=${encodeURIComponent(customer.id)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) {
        throw new Error('Không thể tải lịch sử mua hàng');
      }

      const data = (await res.json()) as ApiInvoice[];
      setCustomerHistoryInvoices(data);
    } catch {
      setCustomerHistoryError('Không thể tải lịch sử mua hàng của khách hàng.');
    } finally {
      setIsLoadingCustomerHistory(false);
    }
  };

  const handlePrintHistoryInvoice = (invoice: ApiInvoice) => {
    downloadInvoicePdf(invoice);
    showToast(`Đã tải PDF hóa đơn ${invoice.id.slice(0, 8)}…`);
  };

  const productsSummary = (invoice: ApiInvoice) =>
    invoice.invoiceDetails?.map((detail) => detail.product?.productName).filter(Boolean).join(', ') || '—';

  return (
    <div className="space-y-6">

      {/* Dynamic Header Block with Toast banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="customer-page-title">
            Khách hàng thành viên
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý cơ sở dữ liệu khách hàng thân thiết, bảng điểm tích lũy thành viên, xếp hạng phân bậc loyalty và kiểm tra lịch sử mua sắm.
          </p>
        </div>

        {notification && (
          <div className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs animate-fadeIn">
            <Check className="w-4 h-4 text-[#3B82F6]" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Quick Summary Cards Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="customer-summary-widgets">
        
        {/* Card 1: Tổng khách hàng */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Khách hàng thành viên</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">{totalCustomers} hội viên liên kết</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Tất cả đều được cấp mã định danh KHxxx</span>
          </div>
        </div>

        {/* Card 2: Tổng điểm tích lũy */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Tổng quỹ điểm đổi quà</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">{totalLoyaltyPoints.toLocaleString('vi-VN')} ⭐</span>
            <span className="text-[10px] text-amber-600 font-bold mt-1 block">Tỉ lệ quy đổi: 10,000đ chi tiêu = 1 điểm</span>
          </div>
        </div>

        {/* Card 3: VIP member count */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Hạng thành viên VIP (Vàng/Diamond)</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">{diamondVipCount} khách hàng</span>
            <span className="text-[10px] text-purple-600 font-bold mt-1 block">Đón tiếp ưu tiên & Ưu đãi chiết khấu hóa đơn</span>
          </div>
        </div>

      </div>

      {/* TOP ACTION BAR - SEARCH & REGISTER TRIGGER */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search controls */}
        <div className="flex-1 max-w-lg relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã, họ tên hoặc số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Action button triggers & segment options */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Segment selection filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as any)}
            className="border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white text-gray-900 focus:outline-none"
          >
            <option value="Tất cả">Tất cả phân nhóm</option>
            <option value="Đồng">Hạng Đồng</option>
            <option value="Bạc">Hạng Bạc</option>
            <option value="Vàng">Hạng Vàng</option>
            <option value="Kim cương">Hạng Kim cương</option>
          </select>

          {/* Create Button */}
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
            id="btn-add-customer-trigger"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm khách hàng</span>
          </button>

        </div>

      </div>

      {/* MAIN DATA GRID - MAIN PORTAL VIEW */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-5 py-3.5">Họ tên</th>
                <th scope="col" className="px-5 py-3.5">Số điện thoại</th>
                <th scope="col" className="px-5 py-3.5">Email</th>
                <th scope="col" className="px-5 py-3.5 text-center">Xếp hạng</th>
                <th scope="col" className="px-5 py-3.5 text-center">Điểm tích lũy</th>
                <th scope="col" className="px-5 py-3.5 text-center">Ngày đăng ký</th>
                <th scope="col" className="px-5 py-3.5 text-right w-44">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150/40 text-xs font-medium text-gray-700">
              {currentItems.map((c) => {
                // Tier design badges styling
                let tierBadge = "bg-gray-50 text-gray-600 border-gray-200";
                if (c.tier === 'Kim cương') {
                  tierBadge = "bg-blue-50 text-blue-700 border-blue-200";
                } else if (c.tier === 'Vàng') {
                  tierBadge = "bg-amber-50 text-amber-700 border-amber-200";
                } else if (c.tier === 'Bạc') {
                  tierBadge = "bg-slate-50 text-slate-700 border-slate-200";
                } else {
                  tierBadge = "bg-orange-50 text-orange-700 border-orange-100";
                }

                return (
                  <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                    
                    {/* Client Name */}
                    <td className="px-5 py-3.5 text-gray-950 font-bold">{c.name}</td>
                    
                    {/* Contact Phone */}
                    <td className="px-5 py-3.5 font-mono text-gray-900 font-semibold">{c.phone}</td>
                    
                    {/* Email address */}
                    <td className="px-5 py-3.5 text-gray-500 font-medium">
                      {c.email ? (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3 w-3 text-gray-400" />
                          <span>{c.email}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 italic">Chưa cập nhật</span>
                      )}
                    </td>

                    {/* Tier badge */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${tierBadge}`}>
                        {c.tier}
                      </span>
                    </td>

                    {/* Loyalty score points highlighted with Star */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center font-bold font-mono text-slate-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                        <span className="text-amber-500 font-bold mr-1">⭐</span>
                        <span>{c.loyaltyPoints}</span>
                      </span>
                    </td>

                    {/* Create joinDate */}
                    <td className="px-5 py-3.5 text-center font-mono text-gray-400">
                      {c.joinDate || '2025-01-01'}
                    </td>

                    {/* Actions links buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        
                        {/* View History Button */}
                        <button
                          onClick={() => void loadCustomerHistory(c)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded text-gray-600 transition flex items-center space-x-0.5"
                          title="Lịch sử giao dịch"
                        >
                          <History className="w-3 h-3" />
                          <span>Xem lịch sử</span>
                        </button>

                        {/* Edit Customer Button */}
                        <button
                          onClick={() => handleOpenEditCustomerModal(c)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded text-gray-600 transition flex items-center space-x-0.5"
                          title="Sửa thông tin khách hàng"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <User className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-pulse" />
                    <p className="text-xs font-bold">Không tìm thấy khách hàng nào khớp kết quả tìm kiếm!</p>
                    <p className="text-[10px] text-gray-400 mt-1">Sử dụng họ tên hoàn chỉnh, mã định danh hoặc SDT khác</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PAGINATION WITH PREV - NEXT */}
        <div className="bg-gray-50/60 px-5 py-3.5 border-t border-gray-150/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          
          <div className="text-gray-500 font-medium">
            Hiển thị từ <span className="font-bold text-gray-950 font-mono">{totalFilteredCount > 0 ? indexOfFirstItem + 1 : 0}</span> đến <span className="font-bold text-gray-950 font-mono">{Math.min(indexOfLastItem, totalFilteredCount)}</span> trong tổng số <span className="font-bold text-[#3B82F6] font-mono">{totalFilteredCount}</span> thành viên lọc được
          </div>

          <div className="inline-flex items-center space-x-1.5 self-end">
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>

            <span className="px-3.5 text-[11px] font-black text-gray-800">
              Page <span className="font-mono text-blue-600">{currentPage}</span> / <span className="font-mono">{totalPages}</span>
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>

      </div>

      {/* ================= MODAL: THÊM KHÁCH HÀNG MỚI ================= */}
      {isAdding && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Đăng ký khách hàng thành viên</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cấp mã định danh và tích lũy ưu đãi mua hàng</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewCustomerSubmit} className="p-5 space-y-4 font-medium">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên khách hàng *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Lê Hoài Nam"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại liên lạc *</label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ví dụ: 0987123456"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ Email (Không bắt buộc)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Ví dụ: nam.le@gmail.com"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950"
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
                  Đăng ký hội viên
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: SỬA THÔNG TIN KHÁCH HÀNG ================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Sửa thông tin khách hàng</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cập nhật đặc quyền và chi tiết liên lạc của hội viên</p>
              </div>
              <button 
                onClick={() => setEditingCustomer(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditCustomerSubmit} className="p-5 space-y-4 font-medium">
              
              {/*<div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Mã khách hàng</span>
                <span className="font-bold text-[#3B82F6] font-mono text-xs">{editingCustomer.id}</span>
              </div>*/}

              {/* Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Số điện thoại *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Địa chỉ Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950"
                  placeholder="Chưa cập nhật email"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-bold transition"
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

      {/* ================= MODAL: XEM LỊCH SỬ GIAO DỊCH ================= */}
      {selectedHistoryCust && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                  <History className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Nhật ký mua sắm hội viên
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Truy vấn hóa đơn lịch sử phát hành trên toàn hệ thống chuỗi siêu thị</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryCust(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Profile Overview */}
            <div className="p-5 bg-gradient-to-r from-blue-50/40 to-slate-50 border-b border-gray-150/50 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-gray-600">
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Khách hàng</span>
                <span className="font-extrabold text-gray-950 text-[13px] block mt-0.5">{selectedHistoryCust.name}</span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Số điện thoại</span>
                <span className="font-bold text-gray-900 font-mono block mt-1">{selectedHistoryCust.phone}</span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Phân hạng</span>
                <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  {selectedHistoryCust.tier}
                </span>
              </div>

              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black">Điểm hiện có</span>
                <span className="font-black text-[#3B82F6] font-mono block mt-1">⭐ {selectedHistoryCust.loyaltyPoints} điểm</span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="p-5 max-h-[32rem] overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Danh sách hóa đơn đã phát hành ({customerHistoryInvoices.length})
                </h4>
                {isLoadingCustomerHistory && (
                  <span className="text-[10px] text-blue-600 font-semibold">Đang tải...</span>
                )}
              </div>

              {customerHistoryError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-600">
                  {customerHistoryError}
                </div>
              )}

              {!isLoadingCustomerHistory && !customerHistoryError && customerHistoryInvoices.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-bounce" />
                  <p className="text-xs font-bold">Thành viên này chưa thực hiện bất kỳ giao dịch nào.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Khi phát hành đơn hàng mới tại quầy, số điểm và chi tiêu sẽ tự động cộng dồn</p>
                </div>
              )}

              {!isLoadingCustomerHistory && !customerHistoryError && customerHistoryInvoices.map((inv) => (
                <div key={inv.id} className="p-3 bg-gray-50 border border-gray-150/40 rounded-xl hover:bg-gray-100/30 transition">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-950 font-mono">{inv.id.slice(0, 8)}…</span>
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                          inv.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'cancelled'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status === 'completed' ? 'Hoàn thành' : inv.status === 'cancelled' ? 'Đã hủy' : 'Nháp'}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        <span>Thời gian: <span className="font-semibold text-gray-600">{formatDateTime(inv.createdAt)}</span></span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        <span>Sản phẩm: <span className="font-semibold text-gray-600">{productsSummary(inv)}</span></span>
                      </div>
                    </div>

                    <div className="text-right space-y-2">
                      <div className="font-black text-gray-950 font-mono">{formatVND(Number(inv.totalAmount))}</div>
                      <div className="text-[10px] text-gray-500">
                        Khuyến mãi: <span className="font-semibold text-gray-600">{inv.promotion?.name || '—'}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedHistoryInvoice(inv)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] rounded bg-white text-gray-700 transition flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem chi tiết</span>
                        </button>
                        <button
                          onClick={() => handlePrintHistoryInvoice(inv)}
                          className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-emerald-400 hover:text-emerald-600 rounded bg-white text-gray-700 transition flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>In hóa đơn</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedHistoryInvoice && (
              <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:bg-white print:relative print:inset-auto">
                <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-xs font-semibold animate-scaleIn print:shadow-none print:border-0">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 print:hidden">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                        <Receipt className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                        Chi tiết hóa đơn
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">{selectedHistoryInvoice.id}</p>
                    </div>
                    <button onClick={() => setSelectedHistoryInvoice(null)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4 font-medium max-h-[75vh] overflow-y-auto">
                    <div className="p-3.5 bg-gray-50 rounded-lg flex justify-between items-center text-xs">
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-black">Khách hàng</span>
                        <span className="font-semibold text-gray-800">{selectedHistoryInvoice.customer?.fullName || 'Khách vãng lai'}</span>
                        {selectedHistoryInvoice.customer?.phone && (
                          <span className="block text-[10px] text-gray-400 font-mono">{selectedHistoryInvoice.customer.phone}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-gray-400 uppercase font-black">Thời gian</span>
                        <span className="font-mono text-gray-700">{formatDateTime(selectedHistoryInvoice.createdAt)}</span>
                      </div>
                    </div>

                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="text-gray-400 uppercase text-[9px] font-bold">
                        <tr>
                          <th className="py-1.5">Sản phẩm</th>
                          <th className="py-1.5 text-center">SL</th>
                          <th className="py-1.5 text-right">Đơn giá</th>
                          <th className="py-1.5 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedHistoryInvoice.invoiceDetails?.map((detail) => (
                          <tr key={detail.id}>
                            <td className="py-2 font-bold text-gray-900">{detail.product?.productName || detail.productId}</td>
                            <td className="py-2 text-center font-mono">{detail.quantity}</td>
                            <td className="py-2 text-right font-mono">{formatVND(Number(detail.unitPrice))}</td>
                            <td className="py-2 text-right font-mono font-bold">{formatVND(Number(detail.subtotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tạm tính:</span>
                        <span className="font-mono font-bold">{formatVND(Number(selectedHistoryInvoice.subtotal))}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Giảm giá {selectedHistoryInvoice.promotion?.name ? `(${selectedHistoryInvoice.promotion.name})` : ''}:</span>
                        <span className="font-mono font-bold">-{formatVND(Number(selectedHistoryInvoice.discountAmount))}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-gray-950 border-t border-gray-200 pt-2">
                        <span>Tổng cộng:</span>
                        <span className="font-mono text-[#3B82F6]">{formatVND(Number(selectedHistoryInvoice.totalAmount))}</span>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100 print:hidden">
                      <button
                        type="button"
                        onClick={() => setSelectedHistoryInvoice(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition"
                      >
                        Đóng
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrintHistoryInvoice(selectedHistoryInvoice)}
                        className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold transition"
                      >
                        In hóa đơn
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Close button */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50/50">
              <button
                onClick={() => setSelectedHistoryCust(null)}
                className="px-5 py-2 bg-gray-900 border border-gray-800 hover:bg-gray-850 text-white rounded-lg font-bold transition shadow-xs text-xs"
              >
                Đóng lại
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
