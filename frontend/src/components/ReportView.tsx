import React, { useState, useEffect } from 'react';
import { Invoice } from '../types';
import { 
  FileText, 
  Calendar, 
  Search, 
  Printer, 
  X, 
  Check, 
  ShoppingBag, 
  DollarSign, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Tag, 
  Layers 
} from 'lucide-react';

interface ReportViewProps {
  invoices: Invoice[];
}

export default function ReportView({ invoices }: ReportViewProps) {
  // Search inputs and dynamic filters
  const [searchVal, setSearchVal] = useState('');
  const [startVal, setStartVal] = useState('2026-05-19'); // Default starting sample window
  const [endVal, setEndVal] = useState('2026-05-20');   // Default ending today

  // Activated filters applied on clicking "Tìm kiếm"
  const [activeSearch, setActiveSearch] = useState('');
  const [activeStartDate, setActiveStartDate] = useState('2026-05-19');
  const [activeEndDate, setActiveEndDate] = useState('2026-05-20');

  // Pagination and detailed dialogs state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Auto-clear notification toast helper
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const triggerToast = (msg: string) => {
    setNotification(msg);
  };

  // Quick statistics calculation for "Hôm nay" (Reference date: 2026-05-20 based on environment metadata)
  const todayRefString = '2026-05-20';
  const todayCompletedInvoices = invoices.filter(i => 
    i.date.startsWith(todayRefString) && i.status === 'Hoàn thành'
  );
  
  const todayCount = todayCompletedInvoices.length;
  const todayRevenue = todayCompletedInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

  // Trigger filters application
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchVal.trim());
    setActiveStartDate(startVal);
    setActiveEndDate(endVal);
    setCurrentPage(1); // Reset to first page when filtering
    triggerToast('Đã lọc lịch sử đơn hàng theo điều kiện tìm kiếm!');
  };

  // Execute filtering criteria on the invoices list
  const filteredInvoices = invoices.filter(invoice => {
    // 1. Text Search matching invoice code or customer name
    const matchText = activeSearch === '' || 
      invoice.invoiceId.toLowerCase().includes(activeSearch.toLowerCase()) ||
      (invoice.customerName && invoice.customerName.toLowerCase().includes(activeSearch.toLowerCase()));

    // 2. Date window matching
    // Extract date string 'YYYY-MM-DD' from '2026-05-20 10:15'
    const invoiceDateOnly = invoice.date.slice(0, 10);
    
    const matchStart = activeStartDate === '' || invoiceDateOnly >= activeStartDate;
    const matchEnd = activeEndDate === '' || invoiceDateOnly <= activeEndDate;

    return matchText && matchStart && matchEnd;
  });

  // Pagination computations
  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoicesList = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Handles simulated print bill output action
  const handlePrintSimulation = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrintingInvoiceId(invoice.invoiceId);
    
    setTimeout(() => {
      setPrintingInvoiceId(null);
      triggerToast(`Đã gửi lệnh in hóa đơn thanh toán cho mã ${invoice.invoiceId} thành công!`);
    }, 1200);
  };

  return (
    <div className="space-y-6 text-xs antialiased">
      
      {/* Toast Notification Container */}
      {notification && (
        <div id="toast-history" className="fixed top-5 right-5 z-50 bg-gray-900 border border-gray-800 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-slideIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-xs">{notification}</span>
        </div>
      )}

      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-2 border-b border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
            <FileText className="w-5.5 h-5.5 mr-2 text-[#3B82F6]" />
            Lịch sử đơn hàng
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Tra cứu thông tin, giám sát doanh thu hóa đơn bán lẻ và in ấn biên bản hóa đơn cho khách chuỗi tiện ích.
          </p>
        </div>
      </div>

      {/* Summary Row Cards (Read-only cards, small size) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Tổng đơn hôm nay */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-blue-50 text-[#3B82F6] rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Tổng đơn hôm nay</span>
              <span className="text-base font-black text-gray-900 font-mono mt-0.5 block">{todayCount} giao dịch</span>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-blue-50 text-blue-800 font-extrabold rounded-md text-[10px] uppercase font-mono">
            {todayRefString}
          </div>
        </div>

        {/* Card 2: Doanh thu hôm nay */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 font-extrabold uppercase tracking-wider">Doanh thu hôm nay (Thuần)</span>
              <span className="text-base font-black text-emerald-600 font-mono mt-0.5 block">{formatVND(todayRevenue)}</span>
            </div>
          </div>
          <div className="px-2.5 py-1 bg-emerald-50 text-emerald-850 font-extrabold rounded-md text-[10px] uppercase font-mono">
            Chỉ số thực
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-3xs">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          {/* Starting date picker */}
          <div className="md:col-span-3 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Từ ngày</label>
            <div className="relative">
              <input 
                type="date"
                value={startVal}
                onChange={(e) => setStartVal(e.target.value)}
                className="w-full pl-3 pr-2 py-2 border border-gray-300 rounded-lg outline-none font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Ending date picker */}
          <div className="md:col-span-3 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Đến ngày</label>
            <div className="relative">
              <input 
                type="date"
                value={endVal}
                onChange={(e) => setEndVal(e.target.value)}
                className="w-full pl-3 pr-2 py-2 border border-gray-300 rounded-lg outline-none font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Free Text Search search term */}
          <div className="md:col-span-4 space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tìm kiếm hóa đơn</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo mã đơn hoặc tên khách hàng"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg outline-none font-medium text-gray-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 bg-white placeholder-gray-400"
              />
            </div>
          </div>

          {/* Submit btn "Tìm kiếm" */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-2 bg-[#3B82F6] hover:bg-blue-600 font-extrabold text-white text-xs rounded-lg transition uppercase tracking-wider shadow-xs shadow-blue-500/10 h-[34px] flex items-center justify-center space-x-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Tìm kiếm</span>
            </button>
          </div>

        </form>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-3xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-black">Mã đơn</th>
                <th className="py-3 px-4 font-black">Thời gian</th>
                <th className="py-3 px-4 font-black">Khách hàng</th>
                <th className="py-3 px-4 font-black">Sản phẩm</th>
                <th className="py-3 px-4 font-black text-right">Tổng tiền</th>
                <th className="py-3 px-4 font-black text-right">Khuyến mãi</th>
                <th className="py-3 px-4 font-bold text-center">Trạng thái</th>
                <th className="py-3 px-4 font-black text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {currentInvoicesList.map((invoice) => {
                // Member flag check
                const isMemberItem = !!invoice.customerId && invoice.customerName !== 'Khách vãng lai';

                return (
                  <tr key={invoice.invoiceId} className="hover:bg-gray-50/50 transition">
                    
                    {/* Mã đơn */}
                    <td className="py-3 px-4 font-extrabold text-[#3B82F6] font-mono whitespace-nowrap">
                      {invoice.invoiceId}
                    </td>

                    {/* Thời gian */}
                    <td className="py-3 px-4 text-gray-500 font-mono whitespace-nowrap">
                      {invoice.date}
                    </td>

                    {/* Khách hàng */}
                    <td className="py-3 px-4 font-semibold text-gray-900 whitespace-nowrap">
                      {isMemberItem ? (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-blue-500 mt-0.5" />
                          <span>{invoice.customerName}</span>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded ml-1 font-sans">
                            Thành viên
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Khách vãng lai</span>
                      )}
                    </td>

                    {/* Sản phẩm */}
                    <td className="py-3 px-4 max-w-[220px] truncate text-gray-600 font-medium">
                      {invoice.productsSummary || (
                        <span className="text-gray-400 italic font-mono text-[11px] flex items-center">
                          <Layers className="w-3.5 h-3.5 mr-1 stroke-1 text-gray-300" />
                          Hóa đơn dồn tích lẻ
                        </span>
                      )}
                    </td>

                    {/* Tổng tiền */}
                    <td className="py-3 px-4 font-bold text-gray-950 font-mono text-right text-xs whitespace-nowrap">
                      {formatVND(invoice.totalAmount)}
                    </td>

                    {/* Khuyến mãi */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {invoice.discountAmount && invoice.discountAmount > 0 ? (
                        <div className="inline-flex items-center text-rose-600 font-bold font-mono">
                          <Tag className="w-3.5 h-3.5 mr-1 text-rose-500" />
                          {`- ${formatVND(invoice.discountAmount)}`}
                        </div>
                      ) : (
                        <span className="text-gray-400 font-mono text-[11px]">0 ₫</span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        invoice.status === 'Hoàn thành'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : invoice.status === 'Đang xử lý'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>

                    {/* Hành động */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-2.5">
                        
                        {/* Xem chi tiết */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="px-2.5 py-1.5 border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold rounded-lg transition text-[11px]"
                        >
                          Xem chi tiết
                        </button>

                        {/* In hóa đơn */}
                        <button
                          type="button"
                          disabled={printingInvoiceId !== null}
                          onClick={(e) => handlePrintSimulation(invoice, e)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold transition flex items-center space-x-1 ${
                            printingInvoiceId === invoice.invoiceId 
                              ? 'bg-gray-100 text-gray-400 cursor-wait' 
                              : 'bg-gray-100 hover:bg-[#3B82F6]/10 text-[#3B82F6] border border-transparent hover:border-[#3B82F6]/20'
                          }`}
                        >
                          <Printer className={`w-3.5 h-3.5 ${printingInvoiceId === invoice.invoiceId ? 'animate-bounce' : ''}`} />
                          <span>{printingInvoiceId === invoice.invoiceId ? 'Đang in...' : 'In hóa đơn'}</span>
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}

              {currentInvoicesList.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 bg-white text-center text-gray-400 font-bold">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto stroke-1 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-gray-500">Không tìm thấy hoá đơn nào khớp với bộ lọc.</p>
                    <p className="text-[10px] text-gray-400 font-normal mt-1">Điều chỉnh từ ngày - đến ngày hoặc nội dung chuỗi từ khóa để rà soát.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination at bottom */}
        {totalItems > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-gray-500 font-semibold text-[11px]">
              Hiển thị <span className="font-bold text-gray-900">{indexOfFirstItem + 1}</span> - <span className="font-bold text-gray-900">{Math.min(indexOfLastItem, totalItems)}</span> trong số <span className="font-bold text-gray-900">{totalItems}</span> hóa đơn
            </div>
            
            <div className="flex items-center space-x-1.5">
              {/* Quay lại button */}
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition text-[11px] disabled:cursor-not-allowed cursor-pointer"
              >
                Quay lại
              </button>

              {/* Pages indicators */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7.5 h-7.5 flex items-center justify-center font-bold text-xs rounded-lg transition ${
                    currentPage === pageNum 
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
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 border border-gray-300 text-gray-750 font-bold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent transition text-[11px] disabled:cursor-not-allowed cursor-pointer"
              >
                Tiếp theo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL DIALOG: CHI TIẾT HÓA ĐƠN ================= */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative bg-white max-w-md w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scaleIn text-xs text-gray-700">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                  <FileText className="w-4 h-4 mr-1.5 text-[#3B82F6]" />
                  Chi tiết hóa đơn bán hàng
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5 font-medium">Bản đối soát điện tử: <span className="font-mono font-bold text-gray-600">{selectedInvoice.invoiceId}</span></p>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-full transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Simulating Receipt Design */}
            <div className="p-5 space-y-4 font-sans bg-white">
              
              <div className="text-center pb-2.5 border-b border-dashed border-gray-200 space-y-1">
                <h4 className="text-sm font-extrabold text-gray-950">SIÊU THỊ TIỆN LỢI COOPMART</h4>
                <p className="text-[10px] text-gray-400">{selectedInvoice.storeName || 'Chi nhánh Quận 1'}</p>
                <p className="text-[9px] text-gray-400 font-mono">Thời gian xuất: {selectedInvoice.date}</p>
              </div>

              {/* Meta row stats */}
              <div className="space-y-1.5 py-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">Số biên lai:</span>
                  <span className="font-bold font-mono text-gray-900">{selectedInvoice.invoiceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Thu ngân phụ trách:</span>
                  <span className="font-bold text-gray-800">{selectedInvoice.staffName || 'Nhân viên hệ thống'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Khách hàng:</span>
                  <span className="font-bold text-gray-900">{selectedInvoice.customerName || 'Khách vãng lai'}</span>
                </div>
                {selectedInvoice.customerId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mã khách hàng:</span>
                    <span className="font-bold font-mono text-gray-800">{selectedInvoice.customerId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Trạng thái thanh toán:</span>
                  <span className="font-bold text-emerald-600">{selectedInvoice.status}</span>
                </div>
              </div>

              {/* Items Detail */}
              <div className="pt-2 border-t border-dashed border-gray-200 space-y-2">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Danh sách mặt hàng</span>
                
                <div className="bg-gray-50/70 p-3 rounded-lg space-y-1.5 leading-relaxed">
                  {selectedInvoice.productsSummary ? (
                    selectedInvoice.productsSummary.split(', ').map((pString, index) => (
                      <div key={index} className="flex justify-between text-gray-800 text-[11px] font-medium">
                        <span>{pString}</span>
                        <span className="text-gray-400 font-mono">Tự động cộng dồn</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 italic text-[11px]">Danh mục gộp mua lẻ tại quầy thu ngân</div>
                  )}
                </div>
              </div>

              {/* Pricing breakdown */}
              <div className="pt-2 border-t border-dashed border-gray-200 space-y-1.5 text-[11px]">
                <div className="flex justify-between font-medium">
                  <span className="text-gray-400">Hàng mua lẻ cộng dồn:</span>
                  <span className="text-gray-900 font-mono">{formatVND(selectedInvoice.totalAmount + (selectedInvoice.discountAmount || 0))}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Khuyến mãi giảm trừ:</span>
                  <span className="font-mono">-{formatVND(selectedInvoice.discountAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-950 font-black text-xs pt-1.5 border-t border-gray-150">
                  <span>TỔNG THU (VAT):</span>
                  <span className="text-base text-gray-900 font-mono">{formatVND(selectedInvoice.totalAmount)}</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-gray-400 border-t border-dashed border-gray-200">
                <p>Cảm ơn Qúy khách đã mua sắm tại {selectedInvoice.storeName}!</p>
                <p className="mt-0.5">Hóa đơn điện tử đối chiếu trực tiếp thời gian thực.</p>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={(e) => handlePrintSimulation(selectedInvoice, e)}
                className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>In hóa đơn này</span>
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-semibold transition text-xs"
              >
                Đóng cửa sổ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
