import { useState } from 'react';
import { ApiInventoryReport } from '../types';
import { fetchInventoryReport } from '../services/reportApi';

export function useInventoryReport() {
  const [data, setData] = useState<ApiInventoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (storeId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInventoryReport(storeId);
      setData(result);
    } catch {
      setError('Không thể tải báo cáo tồn kho');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, load };
}
