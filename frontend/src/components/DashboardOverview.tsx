import { useState, useEffect } from 'react';
import { TrendingUp, ShoppingBag, AlertTriangle, Store, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';
import { Invoice, Product } from '../types';
import { fetchLowStock, ApiLowStockItem } from '../services/inventoryApi';
import { fetchRevenueReport, toDateParam } from '../services/reportApi';
import { getStores } from '../services/store.service';

interface DashboardOverviewProps {
  invoices: Invoice[];
  products: Product[];
  storesCount: number;
  onNavigate: (tab: string) => void;
}

interface DailyPoint {
  date: string; // dd/mm label for the chart
  amount: number;
}

export default function DashboardOverview({ invoices, products: _products, storesCount: _storesCount, onNavigate }: DashboardOverviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [lowStockItems, setLowStockItems] = useState<ApiLowStockItem[]>([]);
  const [storesCount, setStoresCount] = useState(0);
  const [last7DaysRevenue, setLast7DaysRevenue] = useState<DailyPoint[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [yesterdayOrders, setYesterdayOrders] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setFetchError('');
      try {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const todayStr = toDateParam(today);
        const yesterdayStr = toDateParam(yesterday);
        const weekStartStr = toDateParam(weekStart);
        const monthStartStr = toDateParam(monthStart);

        const [lowStock, storesRes, todayReport, yesterdayReport, weekReport, monthReport] = await Promise.all([
          fetchLowStock(),
          getStores(),
          fetchRevenueReport(todayStr, todayStr),
          fetchRevenueReport(yesterdayStr, yesterdayStr),
          fetchRevenueReport(weekStartStr, todayStr),
          fetchRevenueReport(monthStartStr, todayStr),
        ]);

        setLowStockItems(lowStock);
        setStoresCount(storesRes.data.length);
        setTodayRevenue(todayReport.totalRevenue);
        setTodayOrders(todayReport.totalOrders);
        setYesterdayRevenue(yesterdayReport.totalRevenue);
        setYesterdayOrders(yesterdayReport.totalOrders);
        setMonthRevenue(monthReport.totalRevenue);

        // Backfill 7 ngày liên tiếp với 0đ cho những ngày không có dữ liệu trả về,
        // để biểu đồ luôn có đủ 7 điểm dữ liệu liền mạch.
        const dailyMap = new Map(weekReport.dailyRevenue.map((d) => [d.date, d.amount]));
        const pointsList: DailyPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const isoKey = toDateParam(d);
          pointsList.push({
            date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            amount: dailyMap.get(isoKey) ?? 0,
          });
        }
        setLast7DaysRevenue(pointsList);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Không thể tải dữ liệu tổng quan');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const lowStockCount = lowStockItems.length;
  const recentInvoices = invoices.slice(0, 5);

  const revenueChangePct = yesterdayRevenue > 0
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
    : todayRevenue > 0 ? 100 : 0;
  const ordersChangePct = yesterdayOrders > 0
    ? ((todayOrders - yesterdayOrders) / yesterdayOrders) * 100
    : todayOrders > 0 ? 100 : 0;

  // SVG Line Chart calculations
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartData = last7DaysRevenue.length > 0 ? last7DaysRevenue : [{ date: '', amount: 0 }];
  const maxVal = Math.max(...chartData.map(d => d.amount), 1) * 1.1; // 10% headroom, avoid 0-division
  const minVal = 0;

  const points = chartData.map((d, index) => {
    const x = paddingLeft + (chartData.length > 1 ? (index / (chartData.length - 1)) * (chartWidth - paddingLeft - paddingRight) : 0);
    // Inverse relative Y since SVG 0,0 is top-left
    const y = paddingTop + (1 - (d.amount - minVal) / (maxVal - minVal)) * (chartHeight - paddingTop - paddingBottom);
    return { x, y, label: d.date, value: d.amount };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z`;

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-6" id="dashboard-overview-container">

      {fetchError && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-100 text-red-700 rounded-lg text-xs font-semibold">
          {fetchError}
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Doanh thu hôm nay */}
        <div id="stat-revenue" className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Doanh thu hôm nay</span>
            <div className="p-2 bg-blue-50 text-[#3B82F6] rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : formatVND(todayRevenue)}</h3>
            {!isLoading && (
              <p className={`flex items-center text-xs font-semibold mt-1 ${revenueChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span className="flex items-center mr-1">
                  {revenueChangePct >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
                  {revenueChangePct >= 0 ? '+' : ''}{revenueChangePct.toFixed(1)}%
                </span>
                <span className="text-gray-400 font-normal">so với hôm qua</span>
              </p>
            )}
          </div>
        </div>

        {/* Đơn hàng hôm nay */}
        <div id="stat-orders" className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">Đơn hàng hôm nay</span>
            <div className="p-2 bg-[#10B981]/10 text-[#10B981] rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : todayOrders}</h3>
            {!isLoading && (
              <p className={`flex items-center text-xs font-semibold mt-1 ${ordersChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                <span className="flex items-center mr-1">
                  {ordersChangePct >= 0 ? <ArrowUpRight className="w-3 h-3 stroke-[2.5]" /> : <ArrowDownRight className="w-3 h-3 stroke-[2.5]" />}
                  {ordersChangePct >= 0 ? '+' : ''}{ordersChangePct.toFixed(1)}%
                </span>
                <span className="text-gray-400 font-normal">so với hôm qua</span>
              </p>
            )}
          </div>
        </div>

        {/* Sản phẩm sắp hết hàng */}
        <div id="stat-low-stock"
          onClick={() => onNavigate('Sản phẩm')}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 group-hover:text-[#3B82F6] transition">Sản phẩm sắp hết hàng</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-950">{isLoading ? '—' : lowStockCount}</h3>
            <p className="text-xs text-slate-500 font-normal mt-1 flex items-center justify-between">
              <span>Dưới ngưỡng cảnh báo tồn kho</span>
              <span className="text-[#3B82F6] hover:underline font-medium text-xs">Xem chi tiết &rarr;</span>
            </p>
          </div>
        </div>

        {/* Tổng chi nhánh */}
        <div id="stat-stores"
          onClick={() => onNavigate('Chi nhánh')}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 group-hover:text-[#3B82F6] transition">Tổng chi nhánh</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Store className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">{storesCount}</h3>
            <p className="text-xs text-slate-500 font-normal mt-1 flex items-center justify-between">
              <span>Hệ thống bán lẻ chuỗi</span>
              <span className="text-[#3B82F6] hover:underline font-medium text-xs">Xem chi tiết &rarr;</span>
            </p>
          </div>
        </div>

      </div>

      {/* Charts & Warning list grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Line Chart showing revenue last 7 days */}
        <div id="revenue-chart-card" className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-gray-950">Doanh thu 7 ngày gần đây</h3>
              <p className="text-xs text-gray-400">Biểu đồ tổng hợp doanh thu chuỗi cửa hàng</p>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-600 bg-gray-50 p-1 border border-gray-100 rounded-lg">
              <span className="px-2.5 py-1 bg-white text-gray-800 font-semibold rounded-md shadow-xs">Hàng ngày</span>
            </div>
          </div>

          {/* SVG Line Chart (100% responsive wrapper) */}
          <div className="w-full h-48 overflow-visible">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Đang tải dữ liệu doanh thu...</div>
            ) : (
              <svg
                className="w-full h-full overflow-visible font-sans text-[10px] text-gray-400"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingTop + ratio * (chartHeight - paddingTop - paddingBottom);
                  const valueLine = maxVal - ratio * (maxVal - minVal);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={chartWidth - paddingRight}
                        y2={y}
                        className="stroke-gray-100 stroke-1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3}
                        className="fill-gray-400 text-right font-mono"
                        textAnchor="end"
                      >
                        {Math.round(valueLine / 1000000)}M
                      </text>
                    </g>
                  );
                })}

                {/* Path and Area */}
                <path d={areaD} fill="url(#chart-area-grad)" />
                <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interactive Circles / Tooltips */}
                {points.map((p, idx) => {
                  return (
                    <g key={idx} className="group cursor-pointer">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        className="fill-white stroke-[#3B82F6] stroke-2 hover:r-6 hover:fill-[#3B82F6] transition duration-200"
                      />
                      {/* Tooltip on SVG hover */}
                      <text
                        x={p.x}
                        y={p.y - 10}
                        className="fill-gray-800 text-[10px] font-bold text-center opacity-0 group-hover:opacity-100 transition duration-150"
                        textAnchor="middle"
                      >
                        {Math.round(p.value / 1000000)}M
                      </text>
                      {/* X-axis labels */}
                      <text
                        x={p.x}
                        y={chartHeight - 12}
                        className="fill-gray-500 font-medium font-sans"
                        textAnchor="middle"
                      >
                        {p.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
              <span className="font-medium text-gray-600">Tháng này: {isLoading ? '—' : formatVND(monthRevenue)}</span>
            </span>
            <span className="text-gray-400">Thời gian cập nhật: vừa mới xong</span>
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div id="low-stock-checklist-card" className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Sản phẩm sắp hết ({lowStockCount})</h3>
              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-md font-semibold">Cảnh báo</span>
            </div>
            <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
              {isLoading && (
                <p className="text-xs text-gray-400 text-center py-6">Đang tải...</p>
              )}
              {!isLoading && lowStockItems.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Không có sản phẩm nào sắp hết hàng.</p>
              )}
              {!isLoading && lowStockItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2.5 rounded-lg border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition text-xs">
                  <div>
                    <h4 className="font-semibold text-gray-800 line-clamp-1">{item.productName}</h4>
                    <span className="text-[10px] text-gray-500 font-mono mt-0.5 block">{item.sku} • {item.storeName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-800 font-bold font-mono text-sm">{item.quantity}</span>
                    <span className="text-[10px] text-gray-400 block">/ {item.lowStockThreshold} ngưỡng</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('Sản phẩm')}
            className="w-full mt-4 py-2 border border-blue-100 bg-blue-50/30 text-xs font-semibold text-[#3B82F6] rounded-lg hover:bg-[#3B82F6] hover:text-white transition duration-200"
          >
            Nhập hàng ngay
          </button>
        </div>

      </div>

      {/* Đơn hàng gần đây */}
      <div id="recent-invoices-card" className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Đơn hàng gần đây</h3>
            <p className="text-xs text-gray-400">Danh sách các hóa đơn vừa hoàn thành hoặc đang xử lý trong ngày</p>
          </div>
          <button
            onClick={() => onNavigate('Báo cáo')}
            className="text-xs font-semibold text-[#3B82F6] hover:text-blue-700 hover:underline flex items-center"
          >
            Xem tất cả đơn hàng
            <TrendingUp className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600 border-collapse">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Mã đơn</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Chi nhánh</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Nhân viên</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Khách hàng</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100 text-right">Tổng tiền</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {recentInvoices.map((invoice) => (
                <tr key={invoice.invoiceId} className="hover:bg-gray-50/70 transition">
                  <td className="px-5 py-3.5 text-black font-bold font-mono text-[11px]">{invoice.invoiceId}</td>
                  <td className="px-5 py-3.5 text-gray-500">{invoice.storeName}</td>
                  <td className="px-5 py-3.5 text-gray-800 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 grid place-content-center text-[9px] font-bold uppercase">
                      {invoice.staffName.split(' ').slice(-1)[0][0]}
                    </span>
                    <span>{invoice.staffName}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-700">{invoice.customerName || 'Khách vãng lai'}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-gray-950 font-mono text-[11px]">{formatVND(invoice.totalAmount)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      invoice.status === 'Hoàn thành'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : invoice.status === 'Đang xử lý'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                      <span className={`w-1 h-1 rounded-full mr-1.5 ${
                        invoice.status === 'Hoàn thành' ? 'bg-[#10B981]' : invoice.status === 'Đang xử lý' ? 'bg-[#3B82F6]' : 'bg-red-500'
                      }`}></span>
                      {invoice.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
