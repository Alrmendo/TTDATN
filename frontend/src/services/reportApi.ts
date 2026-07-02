import {
  ApiDailyRevenuePoint,
  ApiTopProduct,
  ApiRevenueReport,
  ApiInventoryReportItem,
  ApiInventoryReport,
} from '../types';

export type {
  ApiDailyRevenuePoint,
  ApiTopProduct,
  ApiRevenueReport,
  ApiInventoryReportItem,
  ApiInventoryReport,
};

const API_BASE = 'http://localhost:5000/api';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

async function parseOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Đã có lỗi xảy ra khi gọi API báo cáo');
  }
  return data;
}

/** Format a Date as 'YYYY-MM-DD' for the report query params. */
export function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/reports/revenue?startDate=&endDate=&storeId=
 * Chỉ Manager mới gọi được endpoint này.
 */
export async function fetchRevenueReport(
  startDate: string,
  endDate: string,
  storeId?: string
): Promise<ApiRevenueReport> {
  const params = new URLSearchParams({ startDate, endDate });
  if (storeId) params.set('storeId', storeId);
  const res = await fetch(`${API_BASE}/reports/revenue?${params.toString()}`, { headers: authHeaders() });
  return parseOrThrow(res);
}

/**
 * GET /api/reports/inventory?storeId=
 * Chỉ Manager mới gọi được endpoint này.
 */
export async function fetchInventoryReport(storeId?: string): Promise<ApiInventoryReport> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : '';
  const res = await fetch(`${API_BASE}/reports/inventory${qs}`, { headers: authHeaders() });
  return parseOrThrow(res);
}
