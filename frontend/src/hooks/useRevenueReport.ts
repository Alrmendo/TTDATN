import { useState } from 'react';
import { ApiRevenueReport } from '../types';
import { fetchRevenueReport } from '../services/reportApi';

export function useRevenueReport() {
  const [data, setData] = useState<ApiRevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (startDate: string, endDate: string, storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRevenueReport(startDate, endDate, storeId);
      setData(result);
    } catch {
      setError('Không thể tải báo cáo doanh thu');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, load };
}
