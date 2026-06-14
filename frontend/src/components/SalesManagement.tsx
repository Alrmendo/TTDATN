import { useState, useEffect, FormEvent } from 'react';
import { Product, Customer, Promotion, Invoice } from '../types';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Tag, 
  CheckCircle2, 
  ShoppingCart, 
  Sparkles, 
  AlertCircle, 
  Receipt,
  UserCheck
} from 'lucide-react';

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
  products,
  customers,
  promotions,
  currentUser,
  onAddInvoice,
  onUpdateStock,
  onUpdateCustomerPoints
}: SalesManagementProps) {
  // POS Cart State - Pre-populated with 3 sample products as requested
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoSuccessMessage, setPromoSuccessMessage] = useState('');

  // Payment states
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{
    invoiceId: string;
    subtotal: number;
    discountAmt: number;
    total: number;
    pointsEarned: number;
  } | null>(null);

  // Initialize with 3 sample products on mount once
  useEffect(() => {
    const sampleProducts = [
      { id: 'SP001', qty: 1 }, // Gạo ST25
      { id: 'SP002', qty: 2 }, // Nước mắm Nam Ngư
      { id: 'SP003', qty: 1 }, // Mì tôm Hảo Hảo
    ];

    const initialCart = sampleProducts
      .map(sample => {
        const prod = products.find(p => p.productId === sample.id);
        if (prod) {
          return { product: prod, qty: sample.qty };
        }
        return null;
      })
      .filter((item): item is { product: Product; qty: number } => item !== null);

    setCart(initialCart);
  }, [products]);

  // Handle Search for products to add to current order
  const filteredProductsToSelect = searchQuery.trim() === '' 
    ? [] 
    : products.filter(p => 
        (p.productName.toLowerCase().includes(searchQuery.toLowerCase()) || 
         p.productId.toLowerCase().includes(searchQuery.toLowerCase())) &&
         p.status !== 'Ngừng kinh doanh'
      );

  const handleAddToCart = (prod: Product) => {
    if (prod.stock <= 0) {
      alert('Sản phẩm đã tạm hết hàng trong kho!');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product.productId === prod.productId);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].qty >= prod.stock) {
        alert(`Số lượng yêu cầu vượt quá tồn kho hiện có (${prod.stock} sản phẩm)!`);
        return;
      }
      updatedCart[existingIndex].qty += 1;
      setCart(updatedCart);
    } else {
      setCart([...cart, { product: prod, qty: 1 }]);
    }
    setSearchQuery(''); // clear search query on select
  };

  const handleUpdateQty = (productId: string, val: number) => {
    const updatedCart = cart.map(item => {
      if (item.product.productId === productId) {
        const nextQty = item.qty + val;
        if (nextQty <= 0) return null;
        if (nextQty > item.product.stock) {
          alert(`Chỉ có thể bán tối đa ${item.product.stock} sản phẩm này!`);
          return item;
        }
        return { ...item, qty: nextQty };
      }
      return item;
    }).filter((item): item is { product: Product; qty: number } => item !== null);

    setCart(updatedCart);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.productId !== productId));
  };

  // Find member customer by phone number
  const handlePhoneLookup = () => {
    if (!phoneSearch.trim()) return;
    const found = customers.find(c => c.phone.includes(phoneSearch.trim()));
    if (found) {
      setSelectedCust(found);
    } else {
      alert(`Không tìm thấy hội viên nào có số điện thoại: ${phoneSearch}`);
    }
  };

  // Check promotion code
  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccessMessage('');
    if (!discountCode.trim()) return;

    const matched = promotions.find(p => p.name.toUpperCase() === discountCode.trim().toUpperCase());
    if (!matched) {
      setPromoError('Mã khuyến mãi không chính xác.');
      setAppliedPromo(null);
      return;
    }

    // Check expiry state
    const today = new Date();
    const expiry = new Date(matched.endDate);
    if (expiry < today) {
      setPromoError('Mã khuyến mãi đã hết hạn sử dụng.');
      setAppliedPromo(null);
      return;
    }

    setAppliedPromo(matched);
    setPromoSuccessMessage(`Áp dụng thành công: ${matched.name} (Giảm ${matched.value}%)`);
  };

  // Billing calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  
  // Calculate discounts
  let memberDiscountAmt = 0;
  if (selectedCust) {
    if (selectedCust.tier === 'Kim cương') memberDiscountAmt = subtotal * 0.10;
    else if (selectedCust.tier === 'Vàng') memberDiscountAmt = subtotal * 0.05;
    else if (selectedCust.tier === 'Bạc') memberDiscountAmt = subtotal * 0.02;
  }

  let promoDiscountAmt = 0;
  if (appliedPromo) {
    promoDiscountAmt = subtotal * (appliedPromo.value / 100);
  }

  const totalDiscount = memberDiscountAmt + promoDiscountAmt;
  const totalAmount = Math.max(0, subtotal - totalDiscount);
  const loyaltyPointsEarned = Math.floor(totalAmount / 100000); // 1 point per 100K spent

  // Final confirmation checkout handler
  const handleCheckoutPayment = () => {
    if (cart.length === 0) {
      alert('Không thể thanh toán đơn hàng trống!');
      return;
    }

    setIsProcessing(true);

    // Simulate standard retail billing latency
    setTimeout(() => {
      const newInvoiceId = `HD0${Math.floor(Math.random() * 9000) + 1000}`;
      const savedInvoice: Invoice = {
        invoiceId: newInvoiceId,
        staffId: currentUser?.id || 'NV002',
        staffName: currentUser?.fullName || 'Nguyễn Văn B',
        customerId: selectedCust?.id,
        customerName: selectedCust?.name || 'Khách vãng lai',
        totalAmount,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        storeName: currentUser?.storeName || 'Chi nhánh Quận 1',
        status: 'Hoàn thành',
        productsSummary: cart.map(item => `${item.product.productName} x${item.qty}`).join(', '),
        discountAmount: totalDiscount,
      };

      // Call root mutation state callbacks
      onAddInvoice(savedInvoice);

      // Decrement stock for each item
      cart.forEach(item => {
        onUpdateStock(item.product.productId, item.qty);
      });

      // Update customer loyalty stats
      if (selectedCust) {
        onUpdateCustomerPoints(selectedCust.id, totalAmount, loyaltyPointsEarned);
      }

      setCheckoutResult({
        invoiceId: newInvoiceId,
        subtotal,
        discountAmt: totalDiscount,
        total: totalAmount,
        pointsEarned: loyaltyPointsEarned
      });

      setIsProcessing(false);
    }, 850);
  };

  const handleResetCheckout = () => {
    setCart([]);
    setSelectedCust(null);
    setPhoneSearch('');
    setDiscountCode('');
    setAppliedPromo(null);
    setPromoSuccessMessage('');
    setPromoError('');
    setCheckoutResult(null);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* Title section */}
      <div>
        <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="sales-page-heading">Màn hình bán hàng</h2>
        <p className="text-xs text-gray-500 mt-1">Ghi nhận hóa đơn bán hàng trực tiếp tại quầy, tích lũy điểm hội viên và thanh toán toán chuỗi cửa hàng</p>
      </div>

      {checkoutResult ? (
        /* Checkout Success Screen Modal/Overlay */
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-xl p-8 max-w-xl mx-auto text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-950">Thanh toán thành công!</h3>
            <p className="text-xs text-gray-500 mt-1">Đơn hàng <span className="font-bold text-[#3B82F6] font-mono">{checkoutResult.invoiceId}</span> đã được ghi nhận trên hệ thống</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 text-xs space-y-3 font-medium text-left">
            <div className="flex justify-between border-b border-gray-200/60 pb-2">
              <span className="text-gray-500">Mã giao dịch:</span>
              <span className="text-gray-900 font-bold font-mono">{checkoutResult.invoiceId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tổng tạm tính:</span>
              <span className="text-gray-900 font-bold font-mono">{formatVND(checkoutResult.subtotal)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Đã giảm giá:</span>
              <span className="font-mono">-{formatVND(checkoutResult.discountAmt)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-950 border-t border-dashed border-gray-300 pt-2.5">
              <span>Thực tế thu:</span>
              <span className="text-[#3B82F6] font-extrabold font-mono">{formatVND(checkoutResult.total)}</span>
            </div>
            {selectedCust && (
              <div className="flex justify-between text-emerald-700 font-bold border-t border-gray-200/50 pt-2 mt-1">
                <span>Tích điểm hội viên:</span>
                <span className="flex items-center"><Sparkles className="w-3 h-3 mr-1" /> +{checkoutResult.pointsEarned} điểm</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3 justify-center">
            <button
              onClick={() => {
                const win = window as any;
                win.alert(`Đang tiến hành in hóa đơn cho mã giao dịch ${checkoutResult.invoiceId}...`);
              }}
              className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              In hóa đơn (Roll)
            </button>
            <button
              onClick={handleResetCheckout}
              className="px-5 py-2 text-xs font-bold bg-[#10B981] hover:bg-emerald-600 text-white rounded-lg transition"
            >
              Tạo đơn mới
            </button>
          </div>
        </div>
      ) : (
        /* Interactive Dual Panel Layout (60% / 40%) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="pos-split-layout">
          
          {/* LEFT PANEL: ORDER ITEMS (60%) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-xs flex flex-col min-h-[580px] overflow-hidden" id="pos-left-panel">
            
            {/* Search and Catalog Area */}
            <div className="p-5 border-b border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-950 uppercase tracking-wider flex items-center">
                  <ShoppingCart className="w-4 h-4 mr-2 text-[#3B82F6]" />
                  Chi tiết giỏ hàng ({cart.length} món)
                </span>
                <span className="text-[10px] text-gray-400 font-medium font-mono">Nhân viên: {currentUser?.fullName || 'Vãng lai'}</span>
              </div>

              {/* Product search bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Gõ tìm tên hoặc mã sản phẩm đề thêm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition"
                />

                {/* Auto complete matches dropdown widget */}
                {searchQuery.trim() !== '' && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                    {filteredProductsToSelect.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">Không tìm thấy sản phẩm hợp lệ nào</div>
                    ) : (
                      filteredProductsToSelect.map(p => (
                        <div
                          key={p.productId}
                          onClick={() => handleAddToCart(p)}
                          className="p-2.5 px-4 font-semibold hover:bg-blue-50/70 transition cursor-pointer flex items-center justify-between text-xs text-gray-800"
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-950">{p.productName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">Mã: {p.productId} &bull; Tồn kho: {p.stock} &bull; {p.category}</span>
                          </div>
                          <span className="font-bold font-mono text-[#3B82F6]">{formatVND(p.price)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cart Grid/Table */}
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
                  {cart.map((item) => (
                    <tr key={item.product.productId} className="hover:bg-gray-50/40 transition">
                      
                      {/* Name Col */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-950">{item.product.productName}</span>
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5">{item.product.productId} ({item.product.category})</span>
                        </div>
                      </td>

                      {/* Quantity adjusting buttons control */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="inline-flex items-center space-x-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                          <button
                            onClick={() => handleUpdateQty(item.product.productId, -1)}
                            className="w-5 h-5 rounded hover:bg-white text-gray-500 hover:text-gray-800 transition flex items-center justify-center border border-transparent hover:border-gray-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-gray-900 font-mono">{item.qty}</span>
                          <button
                            onClick={() => handleUpdateQty(item.product.productId, 1)}
                            className="w-5 h-5 rounded hover:bg-white text-gray-500 hover:text-gray-800 transition flex items-center justify-center border border-transparent hover:border-gray-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Standard Unit price */}
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-gray-500">{formatVND(item.product.price)}</td>

                      {/* Row total value */}
                      <td className="px-5 py-3.5 text-right font-mono font-black text-gray-900">{formatVND(item.product.price * item.qty)}</td>

                      {/* Row remove trash bin */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleRemoveFromCart(item.product.productId)}
                          className="p-1 hover:bg-rose-50 text-gray-400 hover:text-red-600 rounded transition"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {cart.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center text-gray-400">
                        <div className="flex flex-col items-center space-y-2">
                          <ShoppingCart className="w-8 h-8 text-gray-300 stroke-1" />
                          <p className="text-xs font-bold">Quy trình bán hàng trống!</p>
                          <p className="text-[11px] text-gray-400">Vui lòng gõ tên sản phẩm vào ô tìm kiếm ở trên để thêm hàng vào hóa đơn.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Suggestions Shelf (For convenient pick addition when empty or looking for items) */}
            <div className="p-4 bg-gray-50/70 border-t border-gray-100">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Hạt giống / Hàng gợi ý bán nhanh</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {products.slice(0, 4).map(p => (
                  <button
                    key={p.productId}
                    onClick={() => handleAddToCart(p)}
                    className="flex items-center space-x-1 border border-gray-200 bg-white hover:border-[#3B82F6] px-2.5 py-1 text-[11px] rounded-full transition font-semibold text-gray-700"
                  >
                    <span>+ {p.productName.split('(')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: BILL SUMMARY (40%) */}
          <div className="lg:col-span-5 space-y-6" id="pos-right-panel">
            
            {/* Customer Member Lookup Box */}
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
                    value={phoneSearch}
                    onChange={(e) => setPhoneSearch(e.target.value)}
                    className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition font-mono"
                  />
                  {phoneSearch && (
                    <button
                      onClick={() => {
                        setPhoneSearch('');
                        setSelectedCust(null);
                      }}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Xóa
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePhoneLookup}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 transition shrink-0"
                >
                  Tìm kiếm
                </button>
              </div>

              {selectedCust ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs flex items-center justify-between animate-fadeIn">
                  <div className="space-y-0.5">
                    <p className="font-bold text-emerald-950 flex items-center">
                      <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      {selectedCust.name}
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      Hạng hội viên: <span className="font-bold uppercase text-emerald-800">{selectedCust.tier}</span> &bull; {selectedCust.loyaltyPoints} điểm tích lũy
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCust(null);
                      setPhoneSearch('');
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:underline hover:text-rose-600"
                  >
                    Hủy liên kết
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">Hệ thống sẽ ghi nhận "Khách vãng lai" nếu không liên kết mã hay số điện thoại thành viên cá nhân.</p>
              )}
            </div>

            {/* Promotion Coupon Code Box */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-bold text-gray-950 uppercase tracking-wider">Khuyến mãi & Vouchers</h3>
              </div>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Mã giảm giá (ví dụ: GIAM10, GIAM20)..."
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value.toUpperCase());
                    setPromoError('');
                  }}
                  className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition uppercase font-mono font-bold"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shrink-0"
                >
                  Áp dụng
                </button>
              </div>

              {promoSuccessMessage && (
                <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-md border border-emerald-100 flex items-center leading-relaxed">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                  {promoSuccessMessage}
                </p>
              )}
              {promoError && (
                <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-md border border-rose-100 flex items-center leading-relaxed">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-rose-500 shrink-0" />
                  {promoError}
                </p>
              )}
            </div>

            {/* Bill Summary Calculations Card */}
            <div className="bg-gray-900 text-gray-100 rounded-xl border border-gray-800 p-6 space-y-5 shadow-md">
              <div className="border-b border-gray-800 pb-3 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest flex items-center">
                  <Receipt className="w-4.5 h-4.5 text-[#3B82F6] mr-2" />
                  Tổng thanh toán
                </span>
                <span className="bg-blue-950 text-[#3B82F6] px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border border-blue-900">Tính VNĐ</span>
              </div>

              <div className="space-y-3.5 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-gray-400">Tạm tính:</span>
                  <span className="font-mono text-white text-sm font-bold">{formatVND(subtotal)}</span>
                </div>

                {selectedCust && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center font-bold">Hội viên ({selectedCust.tier}):</span>
                    <span className="font-mono font-bold">-{formatVND(memberDiscountAmt)}</span>
                  </div>
                )}

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center font-bold">Voucher coupon ({appliedPromo.name}):</span>
                    <span className="font-mono font-bold">-{formatVND(promoDiscountAmt)}</span>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-rose-400 border-t border-gray-800 pt-3">
                    <span>Tổng giảm giá:</span>
                    <span className="font-mono font-bold">-{formatVND(totalDiscount)}</span>
                  </div>
                )}

                <div className="flex justify-between items-end border-t border-dashed border-gray-700/80 pt-4.5">
                  <span className="text-sm font-bold text-gray-300">Tổng thu tiền mặt:</span>
                  <span className="text-lg text-[#10B981] font-black font-mono tracking-tight">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Required Thanh toán green big button */}
              <button
                type="button"
                onClick={handleCheckoutPayment}
                disabled={cart.length === 0 || isProcessing}
                className={`w-full py-3.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 text-sm shadow-md ${
                  cart.length === 0 
                  ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
                  : 'bg-[#10B981] hover:bg-emerald-600 text-white hover:shadow-emerald-950/20 shadow-[#10B981]/20'
                }`}
              >
                <span>{isProcessing ? 'Đang xác nhận thanh toán...' : 'XÁC NHẬN THANH TOÁN (TIỀN MẶT)'}</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
