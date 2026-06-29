import { useState, useEffect } from 'react';
import { ApiStore } from '../types';
import { useRevenueReport } from '../hooks/useRevenueReport';
import { useInventoryReport } from '../hooks/useInventoryReport';
import {
  FileText,
  TrendingUp,
  DollarSign,
  Download,
  BarChart3,
  Store,
  Boxes,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';

export default function RevenueReport() {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  const [reportType, setReportType] = useState<'Doanh thu' | 'Tồn kho'>('Doanh thu');
  const [startDate, setStartDate] = useState(toIsoDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(toIsoDate(today));
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [appliedReportType, setAppliedReportType] = useState<'Doanh thu' | 'Tồn kho'>('Doanh thu');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [stores, setStores] = useState<ApiStore[]>([]);

  const revenue = useRevenueReport();
  const inventory = useInventoryReport();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('http://localhost:5000/api/stores', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => setStores(data))
      .catch(() => {});
  }, []);

  const handleQueryReport = () => {
    if (startDate > endDate) {
      setDateRangeError('Khoảng thời gian không hợp lệ');
      return;
    }
    setDateRangeError(null);
    setAppliedReportType(reportType);
    const storeId = selectedStoreId || undefined;
    if (reportType === 'Doanh thu') {
      revenue.load(startDate, endDate, storeId);
    } else {
      inventory.load(storeId);
    }
  };

  const handleExportCSV = () => {
    alert(`Đang tiến hành xuất tệp dữ liệu báo cáo ${appliedReportType} dưới định dạng MS Excel CSV...`);
  };

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const rd = revenue.data;
  const inv = inventory.data;
  const isLoading = revenue.loading || inventory.loading;

  return (
    <div className="space-y-6">

      {/* Title + export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="report-title">Thống kê & Báo cáo</h2>
          <p className="text-xs text-gray-500 mt-1">Phân tích đa chiều doanh số bán lẻ, biến động luân chuyển kho hàng toàn chuỗi cửa hàng</p>
        </div>
        <button
          id="btn-export-reports"
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-4 py-2 border border-gray-300 hover:border-[#3B82F6] hover:text-[#3B82F6] rounded-lg text-xs font-semibold text-gray-700 bg-white shadow-xs transition"
        >
          <Download className="w-4 h-4" />
          <span>Xuất báo cáo (CSV)</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-end" id="report-filters">

        <div className="md:col-span-3 text-xs space-y-1">
          <label className="block text-gray-500 font-bold uppercase text-[10px]">Loại báo cáo</label>
          <select
            id="report-type-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as 'Doanh thu' | 'Tồn kho')}
            className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          >
            <option value="Doanh thu">Báo cáo doanh số / doanh thu</option>
            <option value="Tồn kho">Báo cáo quản lý tồn kho hàng hóa</option>
          </select>
        </div>

        <div className="md:col-span-4 text-xs space-y-1">
          <label className="block text-gray-500 font-bold uppercase text-[10px]">Khoảng thời gian (Từ ngày — Đến ngày)</label>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              id="report-start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
            <span className="text-gray-400">đến</span>
            <input
              type="date"
              id="report-end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>
          {dateRangeError && (
            <p className="text-[10px] text-red-600 font-bold mt-1">{dateRangeError}</p>
          )}
        </div>

        <div className="md:col-span-3 text-xs space-y-1">
          <label className="block text-gray-500 font-bold uppercase text-[10px]">Chi nhánh</label>
          <select
            id="report-branch-select"
            value={selectedStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white text-gray-900 focus:outline-none"
          >
            <option value="">Tất cả chi nhánh</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.storeName}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <button
            type="button"
            id="btn-report-run"
            onClick={handleQueryReport}
            disabled={isLoading}
            className="w-full py-2 bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isLoading ? 'Đang tải...' : 'Xem báo cáo'}</span>
          </button>
        </div>

      </div>

      {/* Error */}
      {(revenue.error || inventory.error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700 font-semibold">
          {revenue.error || inventory.error}
        </div>
      )}

      {/* Empty-state placeholder before first query */}
      {appliedReportType === 'Doanh thu' && !rd && !revenue.loading && !revenue.error && (
        <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-xs text-center text-gray-400 text-xs">
          Nhấn "Xem báo cáo" để tải dữ liệu doanh thu
        </div>
      )}
      {appliedReportType === 'Tồn kho' && !inv && !inventory.loading && !inventory.error && (
        <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-xs text-center text-gray-400 text-xs">
          Nhấn "Xem báo cáo" để tải dữ liệu tồn kho
        </div>
      )}

      {/* ================= DOANH THU SECTION ================= */}
      {appliedReportType === 'Doanh thu' && rd && (
        <div className="space-y-6 animate-fadeIn">

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="doanh-thu-cards">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng doanh thu thực tế</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{formatVND(rd.totalRevenue)}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng số lượng hóa đơn</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{rd.totalOrders} hóa đơn</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Giá trị đơn hàng trung bình</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{formatVND(rd.averageOrderValue)}</span>
              </div>
            </div>
          </div>

          {/* Interactive bar chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Doanh số bán lẻ theo ngày trong khoảng thời gian {rd.startDate} đến {rd.endDate}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Rà chuột hoặc di chuyển qua các thanh cột để xem chi tiết doanh số mỗi ngày</p>
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-500">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm" />
                <span>Doanh thu thực tế (VNĐ)</span>
              </div>
            </div>
            <div className="relative pt-4 h-64 w-full">
              {rd.dailyRevenue.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">
                  Không có dữ liệu phù hợp trong khoảng thời gian này
                </div>
              ) : (
                <div className="w-full h-full flex flex-col justify-between">
                  <svg viewBox="0 0 600 200" className="w-full h-48 overflow-visible" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9"/>
                        <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.3"/>
                      </linearGradient>
                      <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="1"/>
                        <stop offset="100%" stopColor="#1D4ED8" stopOpacity="0.5"/>
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="600" y2="70" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="600" y2="120" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="170" x2="600" y2="170" stroke="#CDCFCF" strokeWidth="1" />
                    <text x="5" y="24" className="text-[8px] fill-gray-400 font-mono font-bold">12tr</text>
                    <text x="5" y="74" className="text-[8px] fill-gray-400 font-mono font-bold">8tr</text>
                    <text x="5" y="124" className="text-[8px] fill-gray-400 font-mono font-bold">4tr</text>
                    {rd.dailyRevenue.map((point, index) => {
                      const totalBars = rd.dailyRevenue.length;
                      const segmentWidth = 600 / totalBars;
                      const barWidth = Math.min(45, segmentWidth * 0.4);
                      const x = index * segmentWidth + (segmentWidth - barWidth) / 2;
                      const maxVal = 13000000;
                      const barHeight = Math.max(10, (point.amount / maxVal) * 150);
                      const y = 170 - barHeight;
                      const isHovered = hoveredBarIndex === index;
                      const [, mm, dd] = point.date.split('-');
                      const displayDate = `${dd}/${mm}`;
                      return (
                        <g
                          key={point.date}
                          onMouseEnter={() => setHoveredBarIndex(index)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          className="cursor-pointer"
                        >
                          {isHovered && (
                            <rect x={x - 6} y="10" width={barWidth + 12} height="165" fill="#EFF6FF" rx="6" className="transition duration-150" />
                          )}
                          <rect
                            x={x} y={y} width={barWidth} height={barHeight}
                            fill={isHovered ? 'url(#barGradientHover)' : 'url(#barGradient)'}
                            rx="3"
                            className="transition duration-150"
                          />
                          {isHovered && (
                            <g>
                              <rect x={Math.max(10, x - 45)} y={Math.max(5, y - 28)} width="120" height="22" fill="#1E293B" rx="4" />
                              <text
                                x={Math.max(10, x - 45) + 60}
                                y={Math.max(5, y - 28) + 14}
                                textAnchor="middle"
                                className="fill-white text-[9px] font-black font-mono"
                              >
                                {formatVND(point.amount)}
                              </text>
                            </g>
                          )}
                          <text
                            x={x + barWidth / 2} y="185" textAnchor="middle"
                            className={`text-[8.5px] font-mono font-bold ${isHovered ? 'fill-blue-600 font-extrabold' : 'fill-gray-500'}`}
                          >
                            {displayDate}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Top Products table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Sản phẩm bán chạy nhất</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Top 5 sản phẩm có doanh số cao nhất trong kỳ báo cáo</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Dữ liệu đã chuẩn hóa
              </span>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="px-5 py-3 border-b border-gray-100">Sản phẩm</th>
                    <th className="px-5 py-3 border-b border-gray-100">SKU</th>
                    <th className="px-5 py-3 border-b border-gray-100 text-center">Số lượng bán</th>
                    <th className="px-5 py-3 border-b border-gray-100 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {rd.topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400">Không có dữ liệu</td>
                    </tr>
                  ) : rd.topProducts.map((p, i) => (
                    <tr key={p.productId} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3.5 text-gray-950 font-bold">
                        <span className="inline-flex items-center">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black flex items-center justify-center mr-2 shrink-0">{i + 1}</span>
                          {p.productName ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono">{p.sku ?? '—'}</td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold">{p.totalQuantity}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold">{formatVND(p.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ================= TỒN KHO SECTION ================= */}
      {appliedReportType === 'Tồn kho' && inv && (
        <div className="space-y-6 animate-fadeIn">

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="inventory-cards">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Boxes className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng giá trị tồn kho (Giá vốn)</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{formatVND(inv.totalStockValue)}</span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-[#E0F2FE] text-sky-600 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng số lượng sản phẩm tồn kho</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{inv.totalUnits} đơn vị hàng</span>
                <span className="text-[10px] text-[#3B82F6] font-bold mt-1 block">
                  Trung bình ~{inv.totalProducts > 0 ? Math.round(inv.totalUnits / inv.totalProducts) : 0} đơn vị / SKU
                </span>
              </div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Hàng hóa dưới định mức tồn kho tối thiểu</span>
                <span className={`text-base font-black mt-0.5 block ${inv.lowStockCount > 0 ? 'text-red-600 animate-pulse font-extrabold' : 'text-gray-950'}`}>
                  {inv.lowStockCount} SKU sản phẩm
                </span>
                <span className="text-[10px] text-red-600 font-semibold mt-1 block">Cần lập phiếu yêu cầu nhập hàng gấp</span>
              </div>
            </div>
          </div>

          {/* Inventory items table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Chi tiết tồn kho theo sản phẩm</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">Danh sách tồn kho chi tiết cho từng sản phẩm và chi nhánh</p>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="px-5 py-3.5 border-b border-gray-100">Sản phẩm</th>
                    <th className="px-5 py-3.5 border-b border-gray-100">SKU</th>
                    <th className="px-5 py-3.5 border-b border-gray-100">Chi nhánh</th>
                    <th className="px-5 py-3.5 border-b border-gray-100 text-center">Tồn kho</th>
                    <th className="px-5 py-3.5 border-b border-gray-100 text-right">Giá trị vốn</th>
                    <th className="px-5 py-3.5 border-b border-gray-100 text-center">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {inv.items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">Không có dữ liệu tồn kho</td>
                    </tr>
                  ) : inv.items.map(item => (
                    <tr key={`${item.productId}-${item.storeId}`} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3.5 text-gray-950 font-bold">{item.productName ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono">{item.sku ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-700">
                        <span className="flex items-center">
                          <Store className="w-4 h-4 mr-1.5 text-gray-400 shrink-0" />
                          {item.storeName ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold">{formatVND(item.stockValue)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.isLowStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.isLowStock ? 'Tồn kho mỏng' : 'An toàn dự trữ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
