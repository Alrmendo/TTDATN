// frontend/src/hooks/useInventoryReport.ts
//
// Hook fetch dữ liệu cho báo cáo tồn kho — dùng cho summary cards của
// Dashboard Manager (ví dụ "Tổng giá trị tồn kho", "Số SP sắp hết").
//
// Gọi: GET /api/reports/inventory?storeId=
//
// Trả về đúng shape response của ReportService.getInventoryReport:
//   { summary: { totalSkuCount, totalStockValue, lowStockCount }, items: [...] }

import { useState, useEffect, useCallback } from 'react';

export interface InventoryReportItem {
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  quantity: number;
  lowStockThreshold: number;
  costPrice: number;
  stockValue: number;
}

export interface InventoryReportSummary {
  totalSkuCount: number;
  totalStockValue: number;
  lowStockCount: number;
}

export interface InventoryReportData {
  storeId: string | null;
  summary: InventoryReportSummary;
  items: InventoryReportItem[];
}

interface UseInventoryReportParams {
  storeId?: string;
  authToken: string;
  enabled?: boolean;
}

interface UseInventoryReportResult {
  data: InventoryReportData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const API_BASE = '/api';

export function useInventoryReport({
  storeId,
  authToken,
  enabled = true,
}: UseInventoryReportParams): UseInventoryReportResult {
  const [data, setData] = useState<InventoryReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (storeId) params.set('storeId', storeId);

      const res = await fetch(`${API_BASE}/reports/inventory?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || 'Không tải được báo cáo tồn kho');
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [storeId, authToken]);

  useEffect(() => {
    if (enabled) {
      fetchReport();
    }
  }, [fetchReport, enabled]);

  return { data, loading, error, refetch: fetchReport };
}
