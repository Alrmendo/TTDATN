import { useState, useEffect } from 'react';
import type { ApiInvoice } from '../types';
import {
  Search,
  FileText,
  X,
  Printer,
  Eye,
  Calendar,
  Receipt,
  ShoppingBag,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

interface OrderHistoryProps {
  currentUser: { storeId: string | null; role: string };
}

export default function OrderHistory({ currentUser: _currentUser }: OrderHistoryProps) {
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<ApiInvoice | null>(null);

  const getToken = () => localStorage.getItem('token');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatCurrency = (n: number) => n.toLocaleString('vi-VN') + ' ₫';
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

  const fetchInvoices = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());

      const res = await fetch(`${API_BASE}/invoices?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Lỗi tải dữ liệu');
      const data = (await res.json()) as ApiInvoice[];
      setInvoices(data);
    } catch {
      setFetchError('Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchInvoices();
  };

  // Today's summary — computed client-side from the already-fetched invoices
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayInvoices = invoices.filter((inv) => inv.createdAt.slice(0, 10) === todayStr);
  const todayOrderCount = todayInvoices.length;
  const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

  // Pagination over the already server-filtered list
  const totalItems = invoices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoices.slice(indexOfFirstItem, indexOfLastItem);

  const productsSummary = (inv: ApiInvoice) =>
    inv.invoiceDetails?.map((d) => d.product?.productName).filter(Boolean).join(', ') || '—';

  const handlePrint = (inv: ApiInvoice) => {
    setSelectedInvoice(inv);
    showToast(`Đang chuẩn bị in hóa đơn ${inv.id.slice(0, 8)}…`);
    setTimeout(() => window.print(), 150);
  };

  // Loading & error screens — same pattern as AccountManagement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <FileText className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-pulse" />
          <p className="text-xs font-bold">Đang tải lịch sử đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-300 mx-auto stroke-1 mb-2" />
          <p className="text-xs font-bold text-red-500">{fetchError}</p>
          <button onClick={fetchInvoices} className="mt-3 text-xs text-[#3B82F6] underline font-semibold">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="order-history-title">
            Lịch sử đơn hàng
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tra cứu, xem chi tiết và in lại các hóa đơn đã ghi nhận tại quầy.
          </p>
        </div>

        {toastMessage && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs">
            <Receipt className="w-4 h-4 text-[#3B82F6]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="order-history-summary">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-lg"><ShoppingBag className="w-4 h-4" /></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Tổng đơn hôm nay</span>
            <span className="text-sm font-extrabold text-gray-950 font-mono mt-0.5 block">{todayOrderCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Receipt className="w-4 h-4" /></div>
          <div>
            <span className="block text-[10px] text-gray-400 font-bold uppercase">Doanh thu hôm nay</span>
            <span className="text-sm font-extrabold text-emerald-700 font-mono mt-0.5 block">
              {formatCurrency(todayRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        <div className="flex-1 max-w-sm relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo mã đơn hoặc tên khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline">Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-gray-400 font-bold uppercase hidden sm:inline">Đến ngày:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 text-xs font-semibold text-gray-700 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleSearch}
            className="flex items-center space-x-1 px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tìm kiếm</span>
          </button>
        </div>
      </div>

      {/* 4. TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto text-xs font-medium">
          <table className="w-full text-left text-gray-600 border-collapse">

            <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9px] font-bold border-b border-gray-100">
              <tr>
                <th scope="col" className="px-5 py-3.5">Mã đơn</th>
                <th scope="col" className="px-5 py-3.5">Thời gian</th>
                <th scope="col" className="px-5 py-3.5">Khách hàng</th>
                <th scope="col" className="px-5 py-3.5">Sản phẩm</th>
                <th scope="col" className="px-5 py-3.5 text-right">Tổng tiền</th>
                <th scope="col" className="px-5 py-3.5">Khuyến mãi</th>
                <th scope="col" className="px-5 py-3.5 text-right w-44">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-150/40 text-xs text-gray-750">
              {currentItems.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/25 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-gray-950">{inv.id.slice(0, 8)}…</td>
                  <td className="px-5 py-3.5 font-mono text-gray-500">{formatDateTime(inv.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold">{inv.customer?.fullName || 'Khách vãng lai'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate" title={productsSummary(inv)}>
                    {productsSummary(inv)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-black text-gray-900">
                    {formatCurrency(Number(inv.totalAmount))}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{inv.promotion?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center space-x-1.5">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-[#3B82F6] hover:text-[#3B82F6] rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Xem chi tiết</span>
                      </button>
                      <button
                        onClick={() => handlePrint(inv)}
                        className="px-2 py-1 text-[10px] font-extrabold border border-gray-200 hover:border-emerald-400 hover:text-emerald-600 rounded bg-white text-gray-700 transition flex items-center space-x-0.5"
                        title="In hóa đơn"
                      >
                        <Printer className="w-3 h-3" />
                        <span>In hóa đơn</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {currentItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2" />
                    <p className="text-xs font-bold">Không tìm thấy đơn hàng nào khớp tiêu chuẩn lọc!</p>
                    <p className="text-[10px] text-gray-400 mt-1">Vui lòng thay đổi từ khóa hoặc khoảng thời gian tìm kiếm</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION */}
        <div className="bg-gray-50/60 px-5 py-3.5 border-t border-gray-150/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="text-gray-500 font-medium">
            Hiển thị <span className="font-bold text-gray-950 font-mono">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> đến <span className="font-bold text-gray-950 font-mono">{Math.min(indexOfLastItem, totalItems)}</span> trong tổng số <span className="font-bold text-blue-600 font-mono">{totalItems}</span> đơn hàng
          </div>

          <div className="inline-flex items-center space-x-1.5 self-end sm:self-auto">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-0.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Trước</span>
            </button>
            <span className="px-3.5 text-[11px] font-black text-gray-850 font-mono">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-0.5"
            >
              <span>Sau</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== MODAL: CHI TIẾT HÓA ĐƠN ===== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:bg-white print:relative print:inset-auto">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden text-xs font-semibold animate-scaleIn print:shadow-none print:border-0">

            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 print:hidden">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center">
                  <Receipt className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                  Chi tiết hóa đơn
                </h3>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">{selectedInvoice.id}</p>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-medium max-h-[75vh] overflow-y-auto">

              <div className="p-3.5 bg-gray-50 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <span className="block text-[8px] text-gray-400 uppercase font-black">Khách hàng</span>
                  <span className="font-semibold text-gray-800">
                    {selectedInvoice.customer?.fullName || 'Khách vãng lai'}
                  </span>
                  {selectedInvoice.customer?.phone && (
                    <span className="block text-[10px] text-gray-400 font-mono">{selectedInvoice.customer.phone}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="block text-[8px] text-gray-400 uppercase font-black">Thời gian</span>
                  <span className="font-mono text-gray-700">{formatDateTime(selectedInvoice.createdAt)}</span>
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
                  {selectedInvoice.invoiceDetails?.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 font-bold text-gray-900">{d.product?.productName || d.productId}</td>
                      <td className="py-2 text-center font-mono">{d.quantity}</td>
                      <td className="py-2 text-right font-mono">{formatCurrency(Number(d.unitPrice))}</td>
                      <td className="py-2 text-right font-mono font-bold">{formatCurrency(Number(d.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tạm tính:</span>
                  <span className="font-mono font-bold">{formatCurrency(Number(selectedInvoice.subtotal))}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Giảm giá {selectedInvoice.promotion?.name ? `(${selectedInvoice.promotion.name})` : ''}:</span>
                  <span className="font-mono font-bold">-{formatCurrency(Number(selectedInvoice.discountAmount))}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-950 border-t border-gray-200 pt-2">
                  <span>Tổng cộng:</span>
                  <span className="font-mono text-[#3B82F6]">{formatCurrency(Number(selectedInvoice.totalAmount))}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100 print:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(selectedInvoice)}
                  className="px-5 py-2 bg-[#3B82F6] hover:bg-blue-600 font-bold text-white rounded-lg transition flex items-center space-x-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In hóa đơn</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
