import { useState, useEffect, useRef } from 'react';
import { Product, Customer, Promotion, Invoice } from '../types';
import type { ApiProduct, ApiCustomer, ApiInvoiceDetail } from '../types';
import {
  Search,
  Trash2,
  Plus,
  Minus,
  User,
  Tag,
  CheckCircle2,
  ShoppingCart,
  AlertCircle,
  Receipt,
  UserCheck,
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

interface SalesManagementProps {
  products: Product[];
  customers: Customer[];
  promotions: Promotion[];
  currentUser: any;
  onAddInvoice: (inv: Invoice) => void;
  onUpdateStock: (pId: string, qtySold: number) => void;
  onUpdateCustomerPoints: (cId: string, spent: number, points: number) => void;
}

export default function SalesManagement({
  products: _products,
  customers: _customers,
  promotions: _promotions,
  currentUser,
  onAddInvoice: _onAddInvoice,
  onUpdateStock: _onUpdateStock,
  onUpdateCustomerPoints: _onUpdateCustomerPoints,
}: SalesManagementProps) {
  // Draft invoice state
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<ApiInvoiceDetail[]>([]);
  const [invoiceSubtotal, setInvoiceSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<ApiProduct[]>([]);
  const [itemErrorProductId, setItemErrorProductId] = useState<string | null>(null);
  const [itemErrorMessage, setItemErrorMessage] = useState('');

  // Customer lookup
  const [selectedCustomer, setSelectedCustomer] = useState<ApiCustomer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerMessage, setCustomerMessage] = useState('');

  // Promotion
  const [promotionId, setPromotionId] = useState('');
  const [promotionResult, setPromotionResult] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Loading / error / toast
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Per-action submitting flags
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
  const [isSubmittingPromotion, setIsSubmittingPromotion] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getToken = () => localStorage.getItem('token');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatCurrency = (n: number) => n.toLocaleString('vi-VN') + ' ₫';

  // Start (or restart) a fresh draft invoice — mirrors AccountManagement's fetchData
  const handleStartOrder = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Không thể tạo hóa đơn mới');
      const data = await res.json();

      setCurrentInvoiceId(data.id);
      setInvoiceDetails([]);
      setInvoiceSubtotal(0);
      setDiscountAmount(0);
      setTotalAmount(0);
      setProductSearch('');
      setProductResults([]);
      setItemErrorProductId(null);
      setItemErrorMessage('');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setCustomerMessage('');
      setPromotionId('');
      setPromotionResult('');
      setPaymentMethod('');
      setPaymentAmount('');
      setPaymentError('');
    } catch {
      setFetchError('Không thể tạo hóa đơn mới. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleStartOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced product search (300ms)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (productSearch.trim() === '') {
      setProductResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/products/search?q=${encodeURIComponent(productSearch.trim())}`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (!res.ok) return;
        const data = await res.json();
        setProductResults(data as ApiProduct[]);
      } catch {
        // silent — keep previous results on transient network errors
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [productSearch]);

  const searchCustomer = async (phone: string) => {
    setCustomerMessage('');
    if (!phone.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/customers?q=${encodeURIComponent(phone.trim())}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as ApiCustomer[];
      if (data.length > 0) {
        setSelectedCustomer(data[0]);
      } else {
        setSelectedCustomer(null);
        setCustomerMessage('Không tìm thấy khách hàng');
      }
    } catch {
      setCustomerMessage('Không tìm thấy khách hàng');
    }
  };

  // Cart contents changed — a previously applied promotion no longer reflects
  // the current order, so clear it and require the user to re-apply manually.
  const clearStalePromotion = (subtotal: number) => {
    if (discountAmount > 0) {
      setDiscountAmount(0);
      setPromotionId('');
      setPromotionResult('Giỏ hàng đã thay đổi — vui lòng áp dụng lại mã khuyến mãi');
      setTotalAmount(subtotal);
    } else {
      setTotalAmount(subtotal);
    }
  };

  // Shared add/update-quantity call — addItem upserts by (invoiceId, productId)
  const submitItem = async (productId: string, quantity: number) => {
    if (!currentInvoiceId) return;
    setIsSubmittingItem(true);
    setItemErrorProductId(null);
    setItemErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/invoices/${currentInvoiceId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ productId, quantity }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          setItemErrorProductId(productId);
          setItemErrorMessage(data.message || 'Tồn kho không đủ');
        } else {
          showToast(data.message || 'Đã có lỗi xảy ra');
        }
        return;
      }

      // DECIMAL columns (unitPrice, subtotal) come back as strings from Sequelize/Postgres
      const updatedDetail: ApiInvoiceDetail = {
        ...(data as ApiInvoiceDetail),
        quantity: Number(data.quantity),
        unitPrice: Number(data.unitPrice),
        subtotal: Number(data.subtotal),
      };
      setInvoiceDetails((prev) => {
        const idx = prev.findIndex((d) => d.productId === productId);
        const next = idx >= 0
          ? prev.map((d, i) => (i === idx ? { ...d, ...updatedDetail } : d))
          : [...prev, updatedDetail];

        const subtotal = next.reduce((sum, d) => sum + Number(d.subtotal), 0);
        setInvoiceSubtotal(subtotal);
        clearStalePromotion(subtotal);
        return next;
      });

      setProductSearch('');
      setProductResults([]);
    } catch {
      showToast('Không thể kết nối đến server');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleAddItem = (product: ApiProduct) => {
    const existing = invoiceDetails.find((d) => d.productId === product.id);
    const nextQty = existing ? existing.quantity + 1 : 1;
    submitItem(product.id, nextQty);
  };

  const handleChangeQuantity = (detailId: string, delta: -1 | 1) => {
    const detail = invoiceDetails.find((d) => d.id === detailId);
    if (!detail) return;
    const nextQty = detail.quantity + delta;
    if (nextQty <= 0) {
      handleRemoveItem(detail.productId);
      return;
    }
    submitItem(detail.productId, nextQty);
  };

  const handleRemoveItem = async (productId: string) => {
    if (!currentInvoiceId) return;
    setIsSubmittingItem(true);
    try {
      const res = await fetch(`${API_BASE}/invoices/${currentInvoiceId}/items/${productId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        showToast('Không thể xóa sản phẩm');
        return;
      }
      setInvoiceDetails((prev) => {
        const next = prev.filter((d) => d.productId !== productId);
        const subtotal = next.reduce((sum, d) => sum + Number(d.subtotal), 0);
        setInvoiceSubtotal(subtotal);
        clearStalePromotion(subtotal);
        return next;
      });
    } catch {
      showToast('Không thể kết nối đến server');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleApplyPromotion = async () => {
    if (!currentInvoiceId || !promotionId.trim()) return;
    setIsSubmittingPromotion(true);
    setPromotionResult('');
    try {
      const res = await fetch(`${API_BASE}/invoices/${currentInvoiceId}/promotion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ promotionId: promotionId.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPromotionResult(data.message || 'Không áp dụng được');
        return;
      }

      const updatedDiscount = Number(data.discountAmount);
      const updatedTotal = Number(data.totalAmount);
      setDiscountAmount(updatedDiscount);
      setTotalAmount(updatedTotal);

      if (updatedDiscount > 0) {
        setPromotionResult(`Áp dụng thành công: giảm ${formatCurrency(updatedDiscount)}`);
      } else {
        setPromotionResult('Không áp dụng được');
      }
    } catch {
      setPromotionResult('Không thể kết nối đến server');
    } finally {
      setIsSubmittingPromotion(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!currentInvoiceId) return;
    setPaymentError('');

    if (invoiceDetails.length === 0) {
      setPaymentError('Vui lòng thêm sản phẩm vào hóa đơn');
      return;
    }
    if (!paymentMethod) {
      setPaymentError('Vui lòng chọn phương thức thanh toán');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount < totalAmount) {
      setPaymentError('Số tiền không đủ');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch(`${API_BASE}/invoices/${currentInvoiceId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ paymentMethod, amount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPaymentError(data.message || 'Đã có lỗi xảy ra');
        return;
      }

      showToast('Thanh toán thành công');
      await handleStartOrder();
    } catch {
      setPaymentError('Không thể kết nối đến server');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Loading & error screens — same pattern as AccountManagement
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-400">
          <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2 animate-pulse" />
          <p className="text-xs font-bold">Đang khởi tạo hóa đơn mới...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-300 mx-auto stroke-1 mb-2" />
          <p className="text-xs font-bold text-red-500">{fetchError}</p>
          <button onClick={handleStartOrder} className="mt-3 text-xs text-[#3B82F6] underline font-semibold">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="sales-page-heading">
            Màn hình bán hàng
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Ghi nhận hóa đơn bán hàng trực tiếp tại quầy, tích lũy điểm hội viên và thanh toán
          </p>
        </div>

        {toastMessage && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#3B82F6]" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* Dual Panel Layout (60% / 40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="pos-split-layout">

        {/* LEFT PANEL: ORDER ITEMS (60%) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col min-h-[580px] overflow-hidden" id="pos-left-panel">

          <div className="p-5 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2 text-[#3B82F6]" />
                Chi tiết giỏ hàng ({invoiceDetails.length} món)
              </span>
              <span className="text-[10px] text-gray-400 font-medium font-mono">
                Nhân viên: {currentUser?.fullName || 'Vãng lai'}
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Gõ tìm tên hoặc mã sản phẩm để thêm..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition"
              />

              {productSearch.trim() !== '' && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {productResults.length === 0 ? (
                    <div className="p-3 text-center text-xs text-gray-400">Không tìm thấy sản phẩm hợp lệ nào</div>
                  ) : (
                    productResults.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleAddItem(p)}
                        className="p-2.5 px-4 font-semibold hover:bg-blue-50/70 transition cursor-pointer flex items-center justify-between text-xs text-gray-800"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-950">{p.productName}</span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            Mã: {p.sku} {p.category && <>&bull; {p.category.categoryName}</>}
                          </span>
                        </div>
                        <span className="font-bold font-mono text-[#3B82F6]">{formatCurrency(Number(p.price))}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex-grow overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-widest text-[9.5px] font-semibold">
                <tr>
                  <th scope="col" className="px-5 py-3 border-b border-gray-100">Tên SP</th>
                  <th scope="col" className="px-5 py-3 border-b border-gray-100 text-center w-32">Số lượng</th>
                  <th scope="col" className="px-5 py-3 border-b border-gray-100 text-right">Đơn giá</th>
                  <th scope="col" className="px-5 py-3 border-b border-gray-100 text-right">Thành tiền</th>
                  <th scope="col" className="px-5 py-3 border-b border-gray-100 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {invoiceDetails.map((detail) => (
                  <tr key={detail.id} className="hover:bg-gray-50/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-950">
                          {detail.product?.productName || detail.productId}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">{detail.product?.sku}</span>
                        {itemErrorProductId === detail.productId && (
                          <span className="text-[10px] text-rose-600 font-bold mt-0.5">{itemErrorMessage}</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex items-center space-x-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                        <button
                          onClick={() => handleChangeQuantity(detail.id, -1)}
                          disabled={isSubmittingItem}
                          className="w-5 h-5 rounded hover:bg-white text-gray-500 hover:text-gray-800 transition flex items-center justify-center border border-transparent hover:border-gray-200 disabled:opacity-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-xs font-black text-gray-900 font-mono">
                          {detail.quantity}
                        </span>
                        <button
                          onClick={() => handleChangeQuantity(detail.id, 1)}
                          disabled={isSubmittingItem}
                          className="w-5 h-5 rounded hover:bg-white text-gray-500 hover:text-gray-800 transition flex items-center justify-center border border-transparent hover:border-gray-200 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-500">
                      {formatCurrency(Number(detail.unitPrice))}
                    </td>

                    <td className="px-5 py-3.5 text-right font-mono font-black text-gray-900">
                      {formatCurrency(Number(detail.subtotal))}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleRemoveItem(detail.productId)}
                        disabled={isSubmittingItem}
                        className="p-1 hover:bg-rose-50 text-gray-400 hover:text-red-600 rounded transition disabled:opacity-50"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}

                {invoiceDetails.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-gray-400">
                      <div className="flex flex-col items-center space-y-2">
                        <ShoppingCart className="w-8 h-8 text-gray-300 stroke-1" />
                        <p className="text-xs font-bold">Chưa có sản phẩm nào</p>
                        <p className="text-[11px] text-gray-400">
                          Vui lòng gõ tên sản phẩm vào ô tìm kiếm ở trên để thêm hàng vào hóa đơn.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT PANEL: BILL SUMMARY (40%) */}
        <div className="lg:col-span-5 space-y-6" id="pos-right-panel">

          {/* Customer lookup */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Khách hàng thành viên</h3>
            </div>

            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Nhập SĐT khách hàng thân thiết..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onBlur={() => searchCustomer(customerSearch)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') searchCustomer(customerSearch);
                  }}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition font-mono"
                />
                {customerSearch && (
                  <button
                    onClick={() => {
                      setCustomerSearch('');
                      setSelectedCustomer(null);
                      setCustomerMessage('');
                    }}
                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => searchCustomer(customerSearch)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 transition shrink-0"
              >
                Tìm kiếm
              </button>
            </div>

            {selectedCustomer ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-950 flex items-center">
                    <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    {selectedCustomer.fullName}
                  </p>
                  <p className="text-[10px] text-emerald-700">
                    {selectedCustomer.loyaltyPoints?.points ?? 0} điểm tích lũy
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="text-[10px] font-bold text-emerald-700 hover:underline hover:text-rose-600"
                >
                  Hủy liên kết
                </button>
              </div>
            ) : customerMessage ? (
              <p className="text-[11px] text-rose-600 font-bold">{customerMessage}</p>
            ) : (
              <p className="text-[11px] text-gray-400 italic">
                Hệ thống sẽ ghi nhận "Khách vãng lai" nếu không liên kết số điện thoại thành viên.
              </p>
            )}
          </div>

          {/* Promotion */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-400" />
              <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Khuyến mãi & Vouchers</h3>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Mã khuyến mãi (promotionId)..."
                value={promotionId}
                onChange={(e) => setPromotionId(e.target.value)}
                className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition font-mono font-bold"
              />
              <button
                type="button"
                onClick={handleApplyPromotion}
                disabled={isSubmittingPromotion || !promotionId.trim()}
                className="px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shrink-0 disabled:opacity-50"
              >
                {isSubmittingPromotion ? 'Đang áp...' : 'Áp dụng'}
              </button>
            </div>

            {promotionResult && (
              <p
                className={`text-[10px] font-bold p-2.5 rounded-md border flex items-center leading-relaxed ${
                  promotionResult.includes('Không')
                    ? 'text-rose-600 bg-rose-50 border-rose-100'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                }`}
              >
                {promotionResult.includes('Không') ? (
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                )}
                {promotionResult}
              </p>
            )}
          </div>

          {/* Payment + summary */}
          <div className="bg-gray-900 text-gray-100 rounded-xl border border-gray-800 p-6 space-y-5 shadow-md">
            <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center">
                <Receipt className="w-4.5 h-4.5 text-[#3B82F6] mr-2" />
                Tổng thanh toán
              </span>
              <span className="bg-blue-950 text-[#3B82F6] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-blue-900">
                Tính VNĐ
              </span>
            </div>

            {/* Payment method */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Phương thức thanh toán</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cash', label: 'Tiền mặt' },
                  { value: 'card', label: 'Thẻ' },
                  { value: 'transfer', label: 'Chuyển khoản' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`py-2 rounded-lg text-[11px] font-bold border transition ${
                      paymentMethod === opt.value
                        ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Số tiền khách đưa</span>
              <input
                type="number"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm font-mono font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>

            <div className="space-y-3.5 text-xs font-semibold">
              <div className="flex justify-between">
                <span className="text-gray-400">Tạm tính:</span>
                <span className="font-mono text-white text-sm font-bold">{formatCurrency(invoiceSubtotal)}</span>
              </div>

              <div className="flex justify-between text-emerald-400">
                <span>Giảm giá:</span>
                <span className="font-mono font-bold">-{formatCurrency(discountAmount)}</span>
              </div>

              <div className="flex justify-between items-end border-t border-dashed border-gray-700/80 pt-4.5">
                <span className="text-sm font-bold text-gray-300">Tổng cộng:</span>
                <span className="text-lg text-[#10B981] font-black font-mono tracking-tight">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>

            {paymentError && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-semibold">{paymentError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isSubmittingPayment || invoiceDetails.length === 0}
              className={`w-full py-3.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 text-sm shadow-md ${
                isSubmittingPayment || invoiceDetails.length === 0
                  ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                  : 'bg-[#10B981] hover:bg-emerald-600 text-white hover:shadow-emerald-950/20 shadow-[#10B981]/20'
              }`}
            >
              <span>{isSubmittingPayment ? 'Đang xác nhận thanh toán...' : 'THANH TOÁN'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
