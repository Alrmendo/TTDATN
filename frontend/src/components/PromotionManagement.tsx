import { useState, useEffect, FormEvent } from 'react';
import { Promotion } from '../types';
import { 
  Search, 
  Plus, 
  Calendar, 
  Tag, 
  Percent, 
  ArrowRight, 
  X, 
  Edit, 
  Power, 
  PowerOff, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  TrendingDown, 
  AlertCircle,
  PiggyBank
} from 'lucide-react';
import {
  getPromotions,
  createPromotion,
  deactivatePromotion,
  updatePromotion
} from '../services/promotion.service';

interface PromotionManagementProps {
  promotions: Promotion[];
  onAddPromotion: (p: Promotion) => void;
}

export default function PromotionManagement({ 
  promotions, 
  onAddPromotion 
}: PromotionManagementProps) {
  
  // Localized promotion state to allow instant reactive edits/disabling
  const [localPromotions, setLocalPromotions] = useState<Promotion[]>([]);

  const loadPromotions = async () => {
    const data = await getPromotions();

    const mapped = data.map((p: any) => ({
      id: p.id,
      name: p.name,

      type:
        p.type === 'percentage'
          ? 'Phần trăm'
          : 'Giảm tiền mặt',

      value: Number(p.value),

      minSpend: p.minOrderValue,

      startDate: p.startDate.split('T')[0],
      endDate: p.endDate.split('T')[0],

      status:
        !p.isActive
          ? 'Vô hiệu hóa'
          : new Date(p.endDate) < new Date()
            ? 'Hết hạn'
            : 'Đang áp dụng'
    }));

    setLocalPromotions(mapped);
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Tất cả' | 'Đang áp dụng' | 'Hết hạn' | 'Vô hiệu hóa'>('Tất cả');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modals view controls
  const [isAdding, setIsAdding] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form builder fields (Create)
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'Phần trăm' | 'Giảm tiền mặt' | 'Đồng giá'>('Phần trăm');
  const [newValue, setNewValue] = useState(0);
  const [newMinSpend, setNewMinSpend] = useState(100000);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStatus, setNewStatus] = useState('Đang áp dụng');

  // Form builder fields (Edit)
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'Phần trăm' | 'Giảm tiền mặt' | 'Đồng giá'>('Phần trăm');
  const [editValue, setEditValue] = useState(0);
  const [editMinSpend, setEditMinSpend] = useState(100000);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState('Đang áp dụng');

  // Toast / Status ticker
  const [notification, setNotification] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // ------------------ DATA CALCULATION FOR CARDS ------------------
  const totalPromotions = localPromotions.length;
  const activePromoCount = localPromotions.filter(p => p.status === 'Đang áp dụng').length;
  const expiredPromoCount = localPromotions.filter(p => p.status === 'Hết hạn').length;

  // Filtered promotion rows
  const filteredPromotions = localPromotions.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status mapping for filter: 'Tất cả' or specific matching status
    const matchesStatus = filterStatus === 'Tất cả' || p.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination parameters
  const totalItems = filteredPromotions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPromotions.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // ------------------ BUSINESS CODE LOGICS ------------------

  // Submit adding new Promotion
  const handleAddNewPromotionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newValue <= 0 || !newStartDate || !newEndDate) {
      alert('Vui lòng điền đầy đủ dữ liệu cấu hình chương trình!');
      return;
    }

    const newId = `KM${String(localPromotions.length + 1).padStart(3, '0')}`;

    try {
      await createPromotion({
        name: newName.trim(),
        type: newType === 'Phần trăm'
          ? 'percentage'
          : 'fixed',
        value: Number(newValue),
        minOrderValue: Number(newMinSpend),
        startDate: newStartDate,
        endDate: newEndDate,
      });

      await loadPromotions();
    } catch (err) {
      console.error(err);
      alert('Tạo khuyến mãi thất bại');
      return;
    }
    
    // Reset forms
    setNewName('');
    setNewType('Phần trăm');
    setNewValue(0);
    setNewMinSpend(100000);
    setNewStartDate('');
    setNewEndDate('');
    setNewStatus('Đang áp dụng');
    setIsAdding(false);

    triggerToast(`Đã tạo thành công chương trình ưu đãi mới ${newId}!`);
  };

  // Open Edit Dialog Modal
  const handleOpenEditPromoModal = (p: Promotion) => {
    setEditingPromo(p);
    setEditName(p.name);
    setEditType(p.type);
    setEditValue(p.value);
    setEditMinSpend(p.minSpend || 0);
    setEditStartDate(p.startDate);
    setEditEndDate(p.endDate);
    setEditStatus(p.status);
  };

  // Save edits
  const handleSaveEditPromoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPromo) return;

    if (!editName.trim() || editValue <= 0 || !editStartDate || !editEndDate) {
      alert('Vui lòng kiểm tra và điền đầy đủ dữ liệu!');
      return;
    }

    try {
      await updatePromotion(editingPromo.id, {
        name: editName.trim(),
        type: editType === 'Phần trăm'
          ? 'percentage'
          : 'fixed',
        value: Number(editValue),
        minOrderValue: Number(editMinSpend),
        startDate: editStartDate,
        endDate: editEndDate,
      });

      await loadPromotions();

      setEditingPromo(null);

      triggerToast(
        `Đã cập nhật chương trình ưu đãi ${editingPromo.id} thành công!`
      );
    } catch (err) {
      console.error(err);
      alert('Cập nhật khuyến mãi thất bại');
    }
  };

  // Disable (Vô hiệu hóa) handler
  const handleDisablePromo = async (pId: string) => {
    try {
      await deactivatePromotion(pId);

      await loadPromotions();

      triggerToast(
        `Đã áp dụng vô hiệu hóa mã khuyến mãi ${pId}!`
      );
    } catch (err) {
      console.error(err);
      alert('Vô hiệu hóa thất bại');
    }
  };

  // Format Helper for Promo Value column
  const formatPromoValue = (p: Promotion) => {
    if (p.type === 'Phần trăm') return `${p.value}%`;
    return formatVND(p.value);
  };

  return (
    <div className="space-y-6">

      {/* Title Layout header and Notification center */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="promotion-page-title">
            Quản lý khuyến mãi
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Thiết lập các chương trình chiết khấu phần trăm, giảm tiền mặt trực tiếp hay đồng giá áp dụng cho khách mua hàng thân thiết.
          </p>
        </div>

        {notification && (
          <div className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs animate-fadeIn">
            <Check className="w-4 h-4 text-[#3B82F6]" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="promotion-metrics-cards">
        
        {/* Card 1: Tổng số chương trình */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl font-bold">
            <Tag className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Tổng chiến dịch ưu đãi</span>
            <span className="text-sm font-black text-gray-950 font-mono mt-0.5 block">{totalPromotions} chương trình</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Tạo lập lưu trữ trong dữ liệu chuỗi</span>
          </div>
        </div>

        {/* Card 2: Đang áp dụng */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Chiến dịch đang chạy</span>
            <span className="text-sm font-black text-emerald-700 font-sans mt-0.5 block">{activePromoCount} chương trình hoạt động</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1 block">Hệ thống tính thu ngân POS tự động áp dụng</span>
          </div>
        </div>

        {/* Card 3: Đã hết hạn */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-xs">
            <span className="block text-gray-500 font-semibold">Đã quá ngày / Hết hạn</span>
            <span className="text-sm font-black text-red-600 font-mono mt-0.5 block">{expiredPromoCount} chiến dịch</span>
            <span className="text-[10px] text-red-500 font-bold mt-1 block">Sẽ không thể áp dụng khi quét POS</span>
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
            placeholder="Tìm theo mã hoặc tên khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Action dropdown and create campaign button */}
        <div className="flex flex-wrap items-center gap-3">
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white text-gray-900 focus:outline-none"
          >
            <option value="Tất cả">Trạng thái (Tất cả)</option>
            <option value="Đang áp dụng">Đang áp dụng</option>
            <option value="Hết hạn">Hết hạn</option>
            <option value="Vô hiệu hóa">Vô hiệu hóa</option>
          </select>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-1 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
            id="btn-add-promotion-trigger"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm khuyến mãi</span>
          </button>

        </div>

      </div>

      {/* MAIN DATA TABLE PANEL */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs font-medium">
          <table className="w-full text-left text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-5 py-3.5">Mã KM</th>
                <th scope="col" className="px-5 py-3.5">Tên khuyến mãi</th>
                <th scope="col" className="px-5 py-3.5">Hình thức (Loại)</th>
                <th scope="col" className="px-5 py-3.5 text-center">Giá trị giảm</th>
                <th scope="col" className="px-5 py-3.5 text-center">Đơn hàng tối thiểu</th>
                <th scope="col" className="px-5 py-3.5 text-center">Thời gian áp dụng</th>
                <th scope="col" className="px-5 py-3.5 text-center">Trạng thái</th>
                <th scope="col" className="px-5 py-3.5 text-right w-44">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150/40 text-xs text-gray-700">
              {currentItems.map((p) => {
                
                // Color badges configuration based on requirement
                let statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";
                let verifiedStatusLabel = "Đang áp dụng";

                if (p.status === 'Vô hiệu hóa' || p.status === 'Vô hiệu hoá') {
                  statusBadge = "bg-gray-100 text-gray-600 border-gray-200";
                  verifiedStatusLabel = "Vô hiệu hóa";
                } else if (p.status === 'Hết hạn' || p.status === 'Đã kết thúc') {
                  statusBadge = "bg-red-50 text-red-700 border-red-150";
                  verifiedStatusLabel = "Hết hạn";
                } else if (p.status === 'Đang áp dụng' || p.status === 'Đang chạy') {
                  statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  verifiedStatusLabel = "Đang áp dụng";
                } else {
                  // Fallback
                  statusBadge = "bg-blue-50 text-blue-700 border-blue-100";
                  verifiedStatusLabel = p.status;
                }

                return (
                  <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                    
                    {/* ID */}
                    <td className="px-5 py-3.5 font-bold font-mono text-gray-950">{p.id}</td>

                    {/* Name */}
                    <td className="px-5 py-3.5 text-gray-950 font-bold">{p.name}</td>

                    {/* Type mapping: Giảm % / Giảm trực tiếp / Đồng giá */}
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center space-x-1.5 text-gray-500 font-semibold">
                        {p.type === 'Phần trăm' ? (
                          <>
                            <Percent className="w-3.5 h-3.5 text-blue-500" />
                            <span>Giảm %</span>
                          </>
                        ) : p.type === 'Giảm tiền mặt' ? (
                          <>
                            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Giảm trực tiếp</span>
                          </>
                        ) : (
                          <>
                            <PiggyBank className="w-3.5 h-3.5 text-amber-500" />
                            <span>Phần trăm (Đồng giá)</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Discount value amount */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-mono text-gray-900 font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-100/40">
                        {formatPromoValue(p)}
                      </span>
                    </td>

                    {/* Min Spend limit */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="font-mono text-gray-500 font-bold">
                        {p.minSpend ? formatVND(p.minSpend) : formatVND(100000)}
                      </span>
                    </td>

                    {/* Active Period */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center space-x-1 font-mono text-[10px] text-gray-400">
                        <span>{p.startDate}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-gray-300" />
                        <span>{p.endDate}</span>
                      </div>
                    </td>

                    {/* Status badges */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${statusBadge}`}>
                        {verifiedStatusLabel}
                      </span>
                    </td>

                    {/* Actions links buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        
                        {/* Edit Button */}
                        <button
                            onClick={() => handleOpenEditPromoModal(p)}
                            className="px-2 py-1 text-[10px] font-extrabold border border-blue-100 hover:bg-blue-50 text-blue-600 rounded bg-white transition flex items-center space-x-0.5"
                            title="Chỉnh sửa"
                        >
                            <Edit className="w-3 h-3" />
                            <span>Sửa</span>
                        </button>

                        {/* Disable Toggle Button */}
                        {p.status === 'Đang áp dụng' || p.status === 'Đang chạy' ? (
                          <button
                            onClick={() => handleDisablePromo(p.id)}
                            className="px-2 py-1 text-[10px] font-extrabold border border-red-100 hover:bg-red-50 text-red-600 rounded bg-white transition flex items-center space-x-0.5"
                            title="Vô hiệu hóa"
                          >
                            <PowerOff className="w-3 h-3 text-red-500" />
                            <span>Vô hiệu hóa</span>
                          </button>
                        ) : (
                          <span className="px-2 py-1 text-[10px] text-gray-300 pointer-events-none select-none font-semibold">
                            Ngưng áp dụng
                          </span>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredPromotions.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <Tag className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-bounce" />
                    <p className="text-xs font-bold">Không tìm thấy mã ưu đãi hợp lệ nào!</p>
                    <p className="text-[10px] text-gray-400 mt-1">Vui lòng mở rộng từ khóa tìm kiếm hoặc lọc thiết lập phân nhóm khác</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BOTTOM PAGINATION CONTROLS */}
        <div className="bg-gray-50/60 px-5 py-3.5 border-t border-gray-150/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          
          <div className="text-gray-500 font-medium col-span-6">
            Hiển thị <span className="font-bold text-gray-950 font-mono">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> - <span className="font-bold text-gray-950 font-mono">{Math.min(indexOfLastItem, totalItems)}</span> trên tổng số <span className="font-bold text-[#3B82F6] font-mono">{totalItems}</span> ưu đãi
          </div>

          <div className="inline-flex items-center space-x-1.5">
            
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5 animate-pulse" />
              <span>Trước</span>
            </button>

            <span className="px-3.5 text-[11px] font-black text-gray-800 font-mono">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5 animate-pulse" />
            </button>

          </div>

        </div>

      </div>

      {/* ================= MODAL: THÊM CHIẾN DỊCH KHUYẾN MÃI MỚI ================= */}
      {isAdding && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Thiết lập chương trình khuyến mãi</h3>
                <p className="text-[10px] text-gray-400 mt-1">Tạo chương trình ưu đãi tri ân thành viên cửa hàng</p>
              </div>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewPromotionSubmit} className="p-5 space-y-4 font-medium">
              
              {/* Promotion Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Tên CT Khuyến mãi / Ưu đãi *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ví dụ: Giờ vàng giải nhiệt sữa tươi Vinamilk"
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold text-xs"
                />
              </div>

              {/* Type and Value selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Loại hình thức ưu đãi</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold"
                  >
                    <option value="Phần trăm">Chiết khấu theo phần trăm (%)</option>
                    <option value="Giảm tiền mặt">Khấu trừ tiền mặt trực tiếp (VND)</option>
                    <option value="Đồng giá">Đồng giá kịch sàn (VND)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newValue}
                    onChange={(e) => setNewValue(Math.max(1, Number(e.target.value) || 0))}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Min Spend limit config */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Đơn hàng tối thiểu (Min Spend)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={newMinSpend}
                  onChange={(e) => setNewMinSpend(Math.max(0, parseInt(e.target.value) || 0))}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Start and end dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Thời gian bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Hạn thời gian kết thúc</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold font-mono"
                  />
                </div>
              </div>

              {/* Status input initialization */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Trạng thái phát hành ban đầu</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                >
                  <option value="Đang áp dụng">Kích hoạt áp dụng ngay (Đang áp dụng)</option>
                  <option value="Vô hiệu hóa">Chờ duyệt / Đình chỉ (Vô hiệu hóa)</option>
                  <option value="Hết hạn">Hết hạn thanh lý (Hết hạn)</option>
                </select>
              </div>

              {/* Actions Footer */}
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
                  Phát hành ưu đãi
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: SỬA CHƯƠNG TRÌNH KHUYẾN MÃI DỮ LIỆU ================= */}
      {editingPromo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scaleIn text-xs font-semibold">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Hiệu chỉnh chương trình</h3>
                <p className="text-[10px] text-gray-400 mt-1">Cập nhật thời hạn hoặc trị giá giảm giá của chiến dịch</p>
              </div>
              <button 
                onClick={() => setEditingPromo(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditPromoSubmit} className="p-5 space-y-4 font-medium">
              
              <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Mã ưu đãi chiết khấu</span>
                <span className="font-bold text-[#3B82F6] font-mono text-xs">{editingPromo.id}</span>
              </div>

              {/* Promotion Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Tên CT Khuyến mãi / Đợt giảm giá *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold text-xs"
                />
              </div>

              {/* Type vs Value */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Hình thức giảm</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold"
                  >
                    <option value="Phần trăm">Chiết khấu theo phần trăm (%)</option>
                    <option value="Giảm tiền mặt">Khấu trừ tiền mặt trực tiếp (VND)</option>
                    <option value="Đồng giá">Đồng giá kịch sàn (VND)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editValue}
                    onChange={(e) => setEditValue(Math.max(1, Number(e.target.value) || 0))}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Min Spend limit config */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Đơn hàng tối thiểu (Min Spend)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editMinSpend}
                  onChange={(e) => setEditMinSpend(Math.max(0, parseInt(e.target.value) || 0))}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-mono font-bold"
                />
              </div>

              {/* Period start and end */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Thời gian bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">Hạn thời gian kết thúc</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-semibold font-mono"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Trạng thái điều khiển</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-950 font-bold"
                >
                  <option value="Đang áp dụng">Đang hoạt động áp dụng (Đang áp dụng)</option>
                  <option value="Vô hiệu hóa">Thu hồi vô hiệu hóa (Vô hiệu hóa)</option>
                  <option value="Hết hạn">Hết hiệu lực chiến dịch (Hết hạn)</option>
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingPromo(null)}
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

    </div>
  );
}
