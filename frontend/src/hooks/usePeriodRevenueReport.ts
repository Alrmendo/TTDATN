import { useState } from 'react';
import { ApiPeriodRevenueReport } from '../types';
import { fetchMonthRevenue, fetchQuarterRevenue, fetchYearRevenue } from '../services/reportApi';

export function usePeriodRevenueReport() {
  const [data, setData] = useState<ApiPeriodRevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMonth = async (month: number, year: number, storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMonthRevenue(month, year, storeId);
      setData({ total: result.total, breakdown: [{ month, total: result.total }] });
    } catch {
      setError('Không thể tải báo cáo doanh thu theo tháng');
    } finally {
      setLoading(false);
    }
  };

  const loadQuarter = async (quarter: number, year: number, storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchQuarterRevenue(quarter, year, storeId);
      setData(result);
    } catch {
      setError('Không thể tải báo cáo doanh thu theo quý');
    } finally {
      setLoading(false);
    }
  };

  const loadYear = async (year: number, storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchYearRevenue(year, storeId);
      setData(result);
    } catch {
      setError('Không thể tải báo cáo doanh thu theo năm');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, loadMonth, loadQuarter, loadYear };
}
