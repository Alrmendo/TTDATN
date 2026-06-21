import { useState } from 'react';
import { Invoice, Product } from '../types';
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Download, 
  BarChart3, 
  Store, 
  ArrowUpRight, 
  Boxes, 
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Package
} from 'lucide-react';

interface RevenueReportProps {
  invoices: Invoice[];
  products: Product[];
}

export default function RevenueReport({ invoices, products }: RevenueReportProps) {
  // Mặc định: 7 ngày gần nhất tính đến hôm nay
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

  // Filter States
  const [reportType, setReportType] = useState<'Doanh thu' | 'Tồn kho'>('Doanh thu');
  const [startDate, setStartDate] = useState(toIsoDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(toIsoDate(today));
  const [selectedBranch, setSelectedBranch] = useState('Tất cả');
  
  // Interactive applied state (updates on "Xem báo cáo")
  const [appliedReportType, setAppliedReportType] = useState<'Doanh thu' | 'Tồn kho'>('Doanh thu');
  const [appliedStartDate, setAppliedStartDate] = useState(toIsoDate(sevenDaysAgo));
  const [appliedEndDate, setAppliedEndDate] = useState(toIsoDate(today));
  const [appliedBranch, setAppliedBranch] = useState('Tất cả');

  // Lỗi validate khoảng thời gian (startDate > endDate)
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  // Chart hover state for inline interactive bar tooltips
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Trigger Filter recalculation
  const handleQueryReport = () => {
    // Validate: startDate <= endDate — khớp với rule "Khoảng thời gian không hợp lệ"
    // của GET /reports/revenue ở backend.
    if (startDate > endDate) {
      setDateRangeError('Khoảng thời gian không hợp lệ');
      return;
    }
    setDateRangeError(null);
    setAppliedReportType(reportType);
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setAppliedBranch(selectedBranch);
  };

  // Export current report simulation
  const handleExportCSV = () => {
    alert(`Đang tiến hành xuất tệp dữ liệu báo cáo ${appliedReportType} (${appliedStartDate} đến ${appliedEndDate}) dưới định dạng MS Excel CSV...`);
  };

  // Helper date parsing/matching function
  const isDateWithinRange = (dateStr: string, start: string, end: string) => {
    // invoice date is e.g. "2026-05-20 10:15"
    const normalizedDate = dateStr.slice(0, 10); // "2026-05-20"
    return normalizedDate >= start && normalizedDate <= end;
  };

  // 1. DATA CALCULATION FOR "DOANH THU" REPORT
  const validInvoices = invoices.filter(invoice => {
    const isCompleted = invoice.status === 'Hoàn thành';
    const matchesBranch = appliedBranch === 'Tất cả' || invoice.storeName === appliedBranch;
    const matchesDate = isDateWithinRange(invoice.date, appliedStartDate, appliedEndDate);
    return isCompleted && matchesBranch && matchesDate;
  });

  const totalRevenue = validInvoices.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalOrdersCount = validInvoices.length;
  const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0;

  // Sinh danh sách ngày động trong khoảng [appliedStartDate, appliedEndDate]
  // (thay cho dateLabels cứng 2026-05-14 → 2026-05-20 trước đây)
  const dateLabels: { key: string; display: string }[] = [];
  {
    const cursor = new Date(appliedStartDate);
    const end = new Date(appliedEndDate);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const [, m, d] = key.split('-');
      dateLabels.push({ key, display: `${d}/${m}` });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Group revenue theo ngày từ dữ liệu invoice THẬT — không còn mock fallback
  const dailyChartData = dateLabels.map(day => {
    const matchesVal = invoices
      .filter(i => i.status === 'Hoàn thành' && i.date.startsWith(day.key) && (appliedBranch === 'Tất cả' || i.storeName === appliedBranch))
      .reduce((sum, item) => sum + item.totalAmount, 0);

    return {
      date: day.display,
      fullDate: day.key,
      revenue: matchesVal,
    };
  });

  // 2. DATA CALCULATION FOR "TỒN KHO" REPORT (Alternative toggle view)
  const totalStockItems = products.reduce((sum, item) => sum + item.stock, 0);
  const totalStockCost = products.reduce((sum, item) => sum + (item.cost * item.stock), 0);
  const totalStockValue = products.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const alertLowStockCount = products.filter(p => p.stock <= 5).length;

  const categoryStockBreakdown = Array.from(new Set(products.map(p => p.category))).map(cat => {
    const list = products.filter(p => p.category === cat);
    const count = list.reduce((sum, item) => sum + item.stock, 0);
    const costValue = list.reduce((sum, item) => sum + (item.cost * item.stock), 0);
    return {
      category: cat,
      stockCount: count,
      totalCostValue: costValue,
    };
  });

  // Cơ cấu doanh thu theo chi nhánh — tính THẬT từ validInvoices (đã lọc theo
  // ngày + trạng thái 'Hoàn thành' + chi nhánh đang chọn ở trên), không còn
  // dữ liệu 3 chi nhánh hard-code.
  const storeRevenueMap = new Map<string, { count: number; revenue: number }>();
  for (const inv of validInvoices) {
    const existing = storeRevenueMap.get(inv.storeName);
    if (existing) {
      existing.count += 1;
      existing.revenue += inv.totalAmount;
    } else {
      storeRevenueMap.set(inv.storeName, { count: 1, revenue: inv.totalAmount });
    }
  }

  const formattedBranchesTable = Array.from(storeRevenueMap.entries())
    .map(([storeName, v]) => ({
      storeName,
      count: v.count,
      revenue: v.revenue,
      percent: totalRevenue > 0 ? Math.round((v.revenue / totalRevenue) * 100) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Danh sách chi nhánh — sinh động từ dữ liệu invoices thật (thay cho 3 tên hard-code)
  const branchOptions = Array.from(new Set(invoices.map(i => i.storeName))).sort();

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Page title & action block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="report-title">Thống kê & Báo cáo</h2>
          <p className="text-xs text-gray-500 mt-1">Phân tích đa chiều doanh số bán lẻ, biến động luân chuyển kho hàng toàn chuỗi cửa hàng</p>
        </div>

        {/* Required top-right outline export button */}
        <button
          id="btn-export-reports"
          onClick={handleExportCSV}
          className="flex items-center space-x-1.5 px-4 py-2 border border-gray-300 hover:border-[#3B82F6] hover:text-[#3B82F6] rounded-lg text-xs font-semibold text-gray-700 bg-white shadow-xs transition"
        >
          <Download className="w-4 h-4" />
          <span>Xuất báo cáo (CSV)</span>
        </button>
      </div>

      {/* Required Filter bar */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-end" id="report-filters">
        
        {/* Dropdown "Loại báo cáo" (Doanh thu / Tồn kho) */}
        <div className="md:col-span-3 text-xs space-y-1">
          <label className="block text-gray-500 font-bold uppercase text-[10px]">Loại báo cáo</label>
          <select
            id="report-type-select"
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-bold bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          >
            <option value="Doanh thu">Báo cáo doanh số / doanh thu</option>
            <option value="Tồn kho">Báo cáo quản lý tồn kho hàng hóa</option>
          </select>
        </div>

        {/* Date range picker (Từ ngày — Đến ngày) */}
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

        {/* Dropdown "Chi nhánh" */}
        <div className="md:col-span-3 text-xs space-y-1">
          <label className="block text-gray-500 font-bold uppercase text-[10px]">Chi nhánh</label>
          <select
            id="report-branch-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="block w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold bg-white text-gray-900 focus:outline-none"
          >
            <option value="Tất cả">Tất cả chi nhánh</option>
            {branchOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* Button "Xem báo cáo" */}
        <div className="md:col-span-2">
          <button
            type="button"
            id="btn-report-run"
            onClick={handleQueryReport}
            className="w-full py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Xem báo cáo</span>
          </button>
        </div>

      </div>

      {appliedReportType === 'Doanh thu' ? (
        /* ================= DOANH THU REPORT SECTION ================= */
        <div className="space-y-6 animate-fadeIn">
          
          {/* Summary Cards: Doanh thu, Tổng đơn, Trung bình */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="doanh-thu-cards">
            
            {/* Card 1: Tổng doanh thu */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng doanh thu thực tế</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{formatVND(totalRevenue)}</span>
              </div>
            </div>

            {/* Card 2: Tổng đơn hàng */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-[#3B82F6] rounded-xl">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng số lượng hóa đơn</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{totalOrdersCount} hóa đơn</span>
              </div>
            </div>

            {/* Card 3: Giá trị đơn trung bình */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Giá trị đơn hàng trung bình</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{formatVND(averageOrderValue)}</span>
              </div>
            </div>

          </div>

          {/* Interactive SVG Bar Chart block */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Doanh số bán lẻ theo ngày trong khoảng thời gian {appliedStartDate} đến {appliedEndDate}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Rà chuột hoặc di chuyển qua các thanh cột để xem chi tiết doanh số mỗi ngày</p>
              </div>

              <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-500">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-sm" />
                <span>Doanh thu thực tế (VNĐ)</span>
              </div>
            </div>

            {/* Responsive SVG Bar Chart drawing */}
            <div className="relative pt-4 h-64 w-full">
              {dailyChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium">
                  Không có dữ liệu phù hợp trong khoảng thời gian này
                </div>
              ) : (
                <div className="w-full h-full flex flex-col justify-between">
                  
                  {/* SVG Canvas block */}
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

                    {/* Horizontal background grid guidelines */}
                    <line x1="0" y1="20" x2="600" y2="20" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="70" x2="600" y2="70" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="120" x2="600" y2="120" stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray="4 4" />
                    <line x1="0" y1="170" x2="600" y2="170" stroke="#CDCFCF" strokeWidth="1" />

                    {/* Left Tick labels */}
                    <text x="5" y="24" className="text-[8px] fill-gray-400 font-mono font-bold">12tr</text>
                    <text x="5" y="74" className="text-[8px] fill-gray-400 font-mono font-bold">8tr</text>
                    <text x="5" y="124" className="text-[8px] fill-gray-400 font-mono font-bold">4tr</text>

                    {/* Interactive Bars generation */}
                    {dailyChartData.map((d, index) => {
                      const totalBars = dailyChartData.length;
                      const canvasWidth = 600;
                      const segmentWidth = canvasWidth / totalBars;
                      const barWidth = Math.min(45, segmentWidth * 0.4);
                      const x = (index * segmentWidth) + (segmentWidth - barWidth) / 2;

                      // Peak volume normalization (Max 13,000,000)
                      const maxVal = 13000000;
                      // Calculated height on 150px layout space range (y: 20 to y: 170)
                      const barHeight = Math.max(10, (d.revenue / maxVal) * 150);
                      const y = 170 - barHeight;

                      const isHovered = hoveredBarIndex === index;

                      return (
                        <g 
                          key={d.date}
                          onMouseEnter={() => setHoveredBarIndex(index)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                          className="cursor-pointer"
                        >
                          {/* Active Bar backglow */}
                          {isHovered && (
                            <rect
                              x={x - 6}
                              y="10"
                              width={barWidth + 12}
                              height="165"
                              fill="#EFF6FF"
                              rx="6"
                              className="transition duration-150"
                            />
                          )}

                          {/* Render bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill={isHovered ? "url(#barGradientHover)" : "url(#barGradient)"}
                            rx="3"
                            className="transition duration-150"
                          />

                          {/* Hover revenue floating tooltip overlay on top of bar */}
                          {isHovered && (
                            <g>
                              <rect
                                x={Math.max(10, x - 45)}
                                y={Math.max(5, y - 28)}
                                width="120"
                                height="22"
                                fill="#1E293B"
                                rx="4"
                              />
                              <text
                                x={Math.max(10, x - 45) + 60}
                                y={Math.max(5, y - 28) + 14}
                                textAnchor="middle"
                                className="fill-white text-[9px] font-black font-mono"
                              >
                                {formatVND(d.revenue)}
                              </text>
                            </g>
                          )}

                          {/* Date Tick Bottom Display */}
                          <text
                            x={x + barWidth / 2}
                            y="185"
                            textAnchor="middle"
                            className={`text-[8.5px] font-mono font-bold ${
                              isHovered ? "fill-blue-600 font-extrabold" : "fill-gray-500"
                            }`}
                          >
                            {d.date}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  
                </div>
              )}
            </div>
          </div>

          {/* Table below chart: Chi nhánh, Số đơn hàng, Doanh thu, % tổng */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Cơ cấu doanh thu theo chi nhánh</h4>
                <p className="text-[11px] text-gray-400 mt-0.5">Thống kê chia nhỏ thị phần tổng doanh số trên toàn bộ các kênh chi nhánh cửa hàng thực tế</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Dữ liệu đã chuẩn hóa
              </span>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="px-5 py-3 border-b border-gray-100">Chi nhánh</th>
                    <th className="px-5 py-3 border-b border-gray-100 text-center">Số lượng đơn hàng</th>
                    <th className="px-5 py-3 border-b border-gray-100 text-right">Doanh thu đạt được</th>
                    <th className="px-5 py-3 border-b border-gray-100 text-center w-64">Tỉ trọng đóng góp (% tổng)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {formattedBranchesTable.map((row: any) => (
                    <tr key={row.storeName} className="hover:bg-gray-50/70 transition">
                      <td className="px-5 py-3.5 text-gray-950 font-bold flex items-center select-none">
                        <Store className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                        {row.storeName}
                      </td>
                      <td className="px-5 py-3.5 text-center text-gray-950 font-bold font-mono">{row.count} đơn</td>
                      <td className="px-5 py-3.5 text-right text-gray-950 font-bold font-mono">{formatVND(row.revenue)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center space-x-3 justify-center">
                          <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden shrink-0">
                            <div 
                              className="bg-[#3B82F6] h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${row.percent}%` }}
                            />
                          </div>
                          <span className="font-mono text-gray-950 font-bold w-12 text-left">{row.percent}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {formattedBranchesTable.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400">
                        Không tìm thấy chi nhánh phù hợp với điều kiện lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* ================= TỒN KHO REPORT SECTION ================= */
        <div className="space-y-6 animate-fadeIn">
          
          {/* Inventory summary stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="inventory-cards">
            
            {/* Card 1: Tổng vốn tồn */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Boxes className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng giá trị tồn kho (Giá vốn)</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{formatVND(totalStockCost)}</span>
                <span className="text-[10px] text-amber-600 font-bold mt-1 block">Giá trị quy đổi bán lẻ: {formatVND(totalStockValue)}</span>
              </div>
            </div>

            {/* Card 2: Tổng lượng tồn */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-[#E0F2FE] text-sky-600 rounded-xl">
                <Package className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Tổng số lượng sản phẩm tồn kho</span>
                <span className="text-base font-black text-gray-950 font-mono mt-0.5 block">{totalStockItems} đơn vị hàng</span>
                <span className="text-[10px] text-[#3B82F6] font-bold mt-1 block">Trung bình ~{Math.round(totalStockItems / products.length)} sản phẩm / SKU hàng</span>
              </div>
            </div>

            {/* Card 3: Cảnh báo sắp hết hàng */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <span className="block text-gray-500 font-medium">Hàng hóa dưới định mức tồn kho tối thiểu</span>
                <span className={`text-base font-black mt-0.5 block ${alertLowStockCount > 0 ? "text-red-600 animate-pulse font-extrabold" : "text-gray-950"}`}>
                  {alertLowStockCount} SKU sản phẩm
                </span>
                <span className="text-[10px] text-red-600 font-semibold mt-1 block">Cần lập phiếu yêu cầu nhập hàng gấp</span>
              </div>
            </div>

          </div>

          {/* Table displaying categories inventory breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Cơ cấu lưu kho theo danh mục hàng hóa</h4>
              <p className="text-[11px] text-gray-400 mt-0.5">Phân tích mật độ lưu trữ, tổng vốn hàng hóa lưu trữ phân loại theo danh mục ngành nghề hàng</p>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse text-gray-600">
                <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                  <tr>
                    <th className="px-5 py-3.5 border-b border-gray-100">Danh mục sản phẩm</th>
                    <th className="px-5 py-3.5 border-b border-gray-100 text-center">Tổng lượng tồn kho</th>
                    <th className="px-5 py-3.5 border-b border-gray-100 text-right">Tổng giá trị vốn đầu tư (VND)</th>
                    <th className="px-5 py-3.5 border-b border-gray-100 text-center">Tình trạng hệ thống</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {categoryStockBreakdown.map((row) => {
                    const isLow = row.stockCount < 15;
                    return (
                      <tr key={row.category} className="hover:bg-gray-50/70 transition">
                        <td className="px-5 py-3.5 text-gray-950 font-bold">{row.category}</td>
                        <td className="px-5 py-3.5 text-center text-gray-950 font-bold font-mono">{row.stockCount} sp</td>
                        <td className="px-5 py-3.5 text-right text-gray-950 font-bold font-mono">{formatVND(row.totalCostValue)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isLow 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isLow ? 'Tồn kho mỏng' : 'An toàn dữ trữ'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
