// frontend/src/hooks/useRevenueReport.ts
//
// Hook fetch dữ liệu cho màn hình "Báo cáo doanh thu" và summary cards
// của Dashboard Manager.
//
// Gọi: GET /api/reports/revenue?startDate=&endDate=&storeId=
//
// Trả về đúng shape response của ReportService.getRevenueReport:
//   { totalRevenue, totalOrders, byDay: [{date, revenue, orderCount}], ... }
//
// Cách dùng:
//   const { data, loading, error, refetch } = useRevenueReport({
//     startDate: '2026-06-01',
//     endDate: '2026-06-21',
//     storeId: currentStoreId, // bỏ qua/undefined nếu Manager xem toàn hệ thống
//     authToken,
//   });
//   // data.totalRevenue, data.totalOrders -> dùng cho summary cards
//   // data.byDay -> dùng để vẽ chart trên màn hình "Báo cáo doanh thu"

import { useState, useEffect, useCallback } from 'react';

export interface RevenueByDay {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface RevenueByStore {
  storeId: string;
  storeName: string;
  revenue: number;
  orderCount: number;
  percentage: number;
}

export interface RevenueReportData {
  startDate: string;
  endDate: string;
  storeId: string | null;
  totalRevenue: number;
  totalOrders: number;
  byDay: RevenueByDay[];
  byStore: RevenueByStore[];
}

interface UseRevenueReportParams {
  startDate: string;
  endDate: string;
  storeId?: string;
  authToken: string;
  /** Nếu false, hook không tự fetch — tự gọi refetch() khi cần (ví dụ chờ người dùng bấm "Xem báo cáo") */
  enabled?: boolean;
}

interface UseRevenueReportResult {
  data: RevenueReportData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_BASE = '/api';

export function useRevenueReport({
  startDate,
  endDate,
  storeId,
  authToken,
  enabled = true,
}: UseRevenueReportParams): UseRevenueReportResult {
  const [data, setData] = useState<RevenueReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (storeId) params.set('storeId', storeId);

      const res = await fetch(`${API_BASE}/reports/revenue?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();

      if (!res.ok) {
        // Server trả "Khoảng thời gian không hợp lệ" khi startDate > endDate
        throw new Error(json.message || 'Không tải được báo cáo doanh thu');
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, storeId, authToken]);

  useEffect(() => {
    if (enabled) {
      fetchReport();
    }
  }, [fetchReport, enabled]);

  return { data, loading, error, refetch: fetchReport };
}
