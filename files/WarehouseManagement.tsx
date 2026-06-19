// frontend/src/components/WarehouseManagement.tsx
//
// Màn hình "Quản lý kho" — kết nối API thật theo Schema.md §5:
//   GET   /api/inventory?storeId=
//   GET   /api/inventory/low-stock
//   PATCH /api/inventory   (gọi InventoryService.updateInventory qua backend)
//
// Thay thế hoàn toàn nguồn dữ liệu mock cũ (data.ts → initialProducts.stock).
// Tồn kho giờ luôn đến từ bảng `inventory` theo storeId, KHÔNG còn nằm trên Product.

import { useEffect, useState, useCallback } from 'react';

interface InventoryRow {
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: string;
}

interface LowStockRow extends InventoryRow {
  storeName: string;
}

interface Store {
  id: string;
  storeName: string;
}

interface WarehouseManagementProps {
  stores: Store[];
  /** Token JWT của người dùng hiện tại (Manager/Staff/WarehouseStaff) */
  authToken: string;
}

const API_BASE = '/api';

export default function WarehouseManagement({ stores, authToken }: WarehouseManagementProps) {
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id ?? '');
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [lowStock, setLowStock] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editMode, setEditMode] = useState<'increase' | 'decrease'>('increase');
  const [saving, setSaving] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const fetchInventory = useCallback(
    async (storeId: string) => {
      if (!storeId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/inventory?storeId=${storeId}`, {
          headers: authHeaders,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được tồn kho');
        setInventory(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    },
    [authToken]
  );

  const fetchLowStock = useCallback(
    async (storeId?: string) => {
      try {
        const url = storeId
          ? `${API_BASE}/inventory/low-stock?storeId=${storeId}`
          : `${API_BASE}/inventory/low-stock`;
        const res = await fetch(url, { headers: authHeaders });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Không tải được danh sách sắp hết hàng');
        setLowStock(json.data || []);
      } catch (err) {
        console.error(err);
      }
    },
    [authToken]
  );

  useEffect(() => {
    fetchInventory(selectedStoreId);
    fetchLowStock(selectedStoreId);
  }, [selectedStoreId, fetchInventory, fetchLowStock]);

  function startEdit(row: InventoryRow) {
    setEditingProductId(row.productId);
    setEditQuantity('');
    setEditMode('increase');
  }

  function cancelEdit() {
    setEditingProductId(null);
    setEditQuantity('');
  }

  async function saveEdit(row: InventoryRow) {
    const quantity = Number(editQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('Số lượng phải là số nguyên dương');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/inventory`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          storeId: row.storeId,
          productId: row.productId,
          quantity,
          mode: editMode,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Cập nhật thất bại');

      await fetchInventory(selectedStoreId);
      await fetchLowStock(selectedStoreId);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setSaving(false);
    }
  }

  const lowStockIds = new Set(lowStock.map((r) => r.productId));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Quản lý kho</h1>
          <p style={styles.subtitle}>Theo dõi và điều chỉnh tồn kho theo chi nhánh</p>
        </div>

        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          style={styles.select}
        >
          {stores.length === 0 && <option value="">Không có chi nhánh</option>}
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.storeName}
            </option>
          ))}
        </select>
      </header>

      {lowStock.length > 0 && (
        <div style={styles.alertBanner}>
          <strong>{lowStock.length}</strong> sản phẩm sắp hết hàng
          {selectedStoreId ? ' tại chi nhánh này' : ' trên toàn hệ thống'}.
        </div>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.tableWrapper}>
        {loading ? (
          <div style={styles.emptyState}>Đang tải dữ liệu...</div>
        ) : inventory.length === 0 ? (
          <div style={styles.emptyState}>Không có dữ liệu tồn kho cho chi nhánh này.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>SKU</th>
                <th style={styles.th}>Sản phẩm</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Số lượng</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Ngưỡng cảnh báo</th>
                <th style={styles.th}>Cập nhật lúc</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((row) => {
                const isLow = lowStockIds.has(row.productId) || row.quantity <= row.lowStockThreshold;
                const isEditing = editingProductId === row.productId;

                return (
                  <tr key={row.productId} style={isLow ? styles.rowLow : undefined}>
                    <td style={styles.td}>{row.sku}</td>
                    <td style={styles.td}>{row.productName}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <span style={isLow ? styles.lowQty : undefined}>{row.quantity}</span>
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>{row.lowStockThreshold}</td>
                    <td style={styles.td}>
                      {row.lastUpdated ? new Date(row.lastUpdated).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {isEditing ? (
                        <div style={styles.editGroup}>
                          <select
                            value={editMode}
                            onChange={(e) => setEditMode(e.target.value as 'increase' | 'decrease')}
                            style={styles.modeSelect}
                          >
                            <option value="increase">Nhập thêm</option>
                            <option value="decrease">Xuất bớt</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            placeholder="SL"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            style={styles.input}
                            autoFocus
                          />
                          <button onClick={() => saveEdit(row)} disabled={saving} style={styles.btnPrimary}>
                            Lưu
                          </button>
                          <button onClick={cancelEdit} disabled={saving} style={styles.btnGhost}>
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(row)} style={styles.btnGhost}>
                          Điều chỉnh
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#1a1a1a',
    maxWidth: 1000,
    margin: '0 auto',
    padding: 24,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 16,
    flexWrap: 'wrap',
  },
  title: { fontSize: 22, fontWeight: 700, margin: 0 },
  subtitle: { fontSize: 13, color: '#666', margin: '4px 0 0' },
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #d0d0d0',
    fontSize: 14,
    minWidth: 200,
  },
  alertBanner: {
    background: '#FFF4E5',
    border: '1px solid #F2C572',
    color: '#7A4E00',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  errorBanner: {
    background: '#FDECEC',
    border: '1px solid #F2A6A6',
    color: '#8A1F1F',
    padding: '10px 14px',
    borderRadius: 6,
    fontSize: 13,
    marginBottom: 12,
  },
  tableWrapper: {
    border: '1px solid #e5e5e5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: {
    textAlign: 'left',
    padding: '10px 14px',
    background: '#F7F7F7',
    borderBottom: '1px solid #e5e5e5',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: '#555',
  },
  td: {
    padding: '10px 14px',
    borderBottom: '1px solid #f0f0f0',
  },
  rowLow: { background: '#FFF8EE' },
  lowQty: { color: '#B45309', fontWeight: 700 },
  emptyState: {
    padding: 40,
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
  editGroup: { display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' },
  modeSelect: {
    padding: '4px 6px',
    border: '1px solid #aaa',
    borderRadius: 4,
    fontSize: 13,
  },
  input: {
    width: 64,
    padding: '4px 8px',
    border: '1px solid #aaa',
    borderRadius: 4,
    fontSize: 14,
    textAlign: 'right',
  },
  btnPrimary: {
    background: '#1A1A1A',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent',
    color: '#1A1A1A',
    border: '1px solid #d0d0d0',
    borderRadius: 5,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
};
