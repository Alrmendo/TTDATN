/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  LogOut, 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  UserCheck, 
  Gift, 
  Store as StoreIcon, 
  FileText, 
  Boxes, 
  Menu, 
  X, 
  Trash2, 
  Plus, 
  ShoppingCart,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  Shield
} from 'lucide-react';

import { Product, Category, Employee, AuthUser, Customer, Invoice, Promotion, Store, PurchaseOrder } from './types';
import { roleLabels, defaultTabByRole } from './utils/roleMapping';
import { 
  initialProducts, 
  initialEmployees, 
  initialCustomers, 
  initialInvoices, 
  initialPromotions, 
  initialStores, 
  initialPurchaseOrders 
} from './data';

// Component imports
import DashboardOverview from './components/DashboardOverview';
import ProductManagement from './components/ProductManagement';
import EmployeeManagement from './components/EmployeeManagement';
import CustomerManagement from './components/CustomerManagement';
import PromotionManagement from './components/PromotionManagement';
import StoreManagement from './components/StoreManagement';
import AccountManagement from './components/AccountManagement';
import SalesManagement from './components/SalesManagement';
import OrderHistory from './components/OrderHistory';
import RevenueReport from './components/RevenueReport';
import WarehouseManagement from './components/WarehouseManagement';

import { searchProducts, getProducts, createProduct, deleteProduct, updateProduct } from './services/product.service';

import { getCategories } from './services/category.service';

export default function App() {
  // Authentication states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // App States for mock databases
  const [userRole, setUserRole] = useState<'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho' | ''>('');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);

  const [categories, setCategories] = useState<Category[]>([]);

  // Tab navigation states
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // checkout Terminal (Staff Dashboard) states
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [staffPointsUsed, setStaffPointsUsed] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState('');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      const user = data.user as AuthUser;
      setCurrentUser(user);
      setUserRole(roleLabels[user.role]);
      setIsSuccess(true);
      setActiveTab(defaultTabByRole[user.role]);
    } catch {
      setError('Không thể kết nối đến server. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        setCurrentUser(user);
        setUserRole(roleLabels[user.role]);
        setActiveTab(defaultTabByRole[user.role]);
        setIsSuccess(true);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleDemoFill = (roleEmail: string, pw = 'password123') => {
    setEmail(roleEmail);
    setPassword(pw);
    setError('');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsSuccess(false);
    setUserRole('');
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setCart([]);
    setSelectedCustomer(null);
    setCheckoutSuccess(false);
  };

  const loadProducts = async () => {
    const data = await getProducts();

    setProducts(
      data.map((p: any) => ({
        productId: p.id,
        productName: p.productName,
        categoryId: p.categoryId,
        category: p.category?.categoryName ?? '',
        price: Number(p.price),
        cost: Number(p.costPrice ?? 0),
        stock: 0,
        status: p.isActive
          ? 'Đang kinh doanh'
          : 'Ngừng kinh doanh',
      }))
    );
  };

  const loadCategories = async () => {
    const data = await getCategories();

    setCategories(data);
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const handleSearchProducts = async (keyword: string) => {
    if (!keyword.trim()) {
      await loadProducts();
      return;
    }

    const data = await searchProducts(keyword);

    setProducts(
      data.map((p) => ({
        productId: p.id,
        productName: p.productName,
        categoryId: p.categoryId,
        category: p.category?.categoryName ?? '',
        price: Number(p.price),
        cost: Number(p.costPrice ?? 0),
        stock: 0,
        status: p.isActive
          ? 'Đang kinh doanh'
          : 'Ngừng kinh doanh',
      }))
    );
  };

  // State mutation functions (passed to subcomponents to write persistent mock state changes)
  const handleAddProduct = async (
    product: Product
  ) => {
    await createProduct({
      productName: product.productName,
      sku: product.productId,
      categoryId: product.categoryId,
      price: product.price,
      costPrice: product.cost,
    });

    await loadProducts();
  };

  const handleUpdateProduct =
    async (
      id: string,
      data: Partial<Product>
    ) => {

      await updateProduct(
        id,
        {
          productName:
            data.productName,

          categoryId:
            data.categoryId,

          price:
            data.price,

          costPrice:
            data.cost,
        }
      );

      await loadProducts();
  };

  const handleAddNewInvoice = (inv: Invoice) => {
    setInvoices([inv, ...invoices]);
  };

  const handleUpdateStock = (productId: string, qtySold: number) => {
    setProducts(prevProducts => prevProducts.map(p => 
      p.productId === productId ? { ...p, stock: Math.max(0, p.stock - qtySold) } : p
    ));
  };

  const handleUpdateCustomerPoints = (customerId: string, spent: number, points: number) => {
    setCustomers(prevCustomers => prevCustomers.map(c => 
      c.id === customerId ? { ...c, loyaltyPoints: c.loyaltyPoints + points, totalSpent: c.totalSpent + spent } : c
    ));
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm(`Bạn có chắc muốn xóa sản phẩm ${id}?`)) {
      await deleteProduct(id);

      setProducts(prev =>
        prev.filter(p => p.productId !== id)
      );
    }
  };

  const handleAddEmployee = (e: Employee) => {
    setEmployees([e, ...employees]);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm(`Bạn có chắc muốn ngừng hoạt động tài khoản nhân viên ${id}?`)) {
      setEmployees(employees.map(emp => emp.id === id ? { ...emp, status: 'Vô hiệu hóa' } : emp));
    }
  };

  const handleAddCustomer = (c: Customer) => {
    setCustomers([c, ...customers]);
  };

  const handleAddPromotion = (p: Promotion) => {
    setPromotions([p, ...promotions]);
  };

  // STAFF TERMINAL: Checkout handlers
  const addToCart = (prod: Product) => {
    if (prod.stock <= 0) {
      alert('Sản phẩm đã hết hàng trong kho!');
      return;
    }
    const exists = cart.find(item => item.product.productId === prod.productId);
    if (exists) {
      if (exists.qty >= prod.stock) {
        alert('Không thể bán vượt quá số lượng còn lại trong kho!');
        return;
      }
      setCart(cart.map(item => item.product.productId === prod.productId ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { product: prod, qty: 1 }]);
    }
  };

  const removeFromCart = (pId: string) => {
    setCart(cart.filter(item => item.product.productId !== pId));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
    // Apply simulated member discount (5% for VIP members like Vàng/Kim Cương or loyalty points)
    let discount = 0;
    if (selectedCustomer) {
      if (selectedCustomer.tier === 'Kim cương') discount = subtotal * 0.10;
      else if (selectedCustomer.tier === 'Vàng') discount = subtotal * 0.05;
      else if (selectedCustomer.tier === 'Bạc') discount = subtotal * 0.02;
    }
    
    const finalAmount = Math.max(0, subtotal - discount);
    const invoiceId = `HD0${invoices.length + 1}`;

    const newInvoice: Invoice = {
      invoiceId,
      staffId: currentUser?.id || 'NV002',
      staffName: currentUser?.fullName || 'Vãng lai',
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name || 'Khách vãng lai',
      totalAmount: finalAmount,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      storeName: 'Chi nhánh Quận 1',
      status: 'Hoàn thành'
    };

    // Update state lists
    setInvoices([newInvoice, ...invoices]);
    setProducts(products.map(p => {
      const cartItem = cart.find(ci => ci.product.productId === p.productId);
      return cartItem ? { ...p, stock: p.stock - cartItem.qty } : p;
    }));

    if (selectedCustomer) {
      setCustomers(customers.map(c => {
        if (c.id === selectedCustomer.id) {
          const addedPoints = Math.floor(finalAmount / 50000); // 1 point per 50K spent
          return {
            ...c,
            loyaltyPoints: c.loyaltyPoints + addedPoints,
            totalSpent: c.totalSpent + finalAmount
          };
        }
        return c;
      }));
    }

    setLastInvoiceId(invoiceId);
    setCheckoutSuccess(true);
    setCart([]);
  };

  // WAREHOUSE TERMINAL: shipment helper
  const handleConfirmPurchaseOrder = (orderId: string) => {
    const order = purchaseOrders.find(po => po.orderId === orderId);
    if (!order) return;

    if (confirm(`Xác nhận nhập kho cho đơn hàng ${orderId}? Số lượng tồn kho sẽ tự động tăng tương ứng.`)) {
      setPurchaseOrders(purchaseOrders.map(po => po.orderId === orderId ? { ...po, status: 'Đã nhập kho' as const } : po));
      
      // Update stock levels
      setProducts(products.map(p => {
        if (p.productId === 'SP003') return { ...p, stock: p.stock + 60 };
        if (p.productId === 'SP007') return { ...p, stock: p.stock + 20 };
        if (p.productId === 'SP009') return { ...p, stock: p.stock + 30 };
        return p;
      }));
    }
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] font-sans text-gray-800 flex flex-col selection:bg-blue-100 selection:text-blue-800">
      
      {/* 1. Login State Screen */}
      {!isSuccess ? (
        <div className="flex-1 w-full flex flex-col justify-center items-center px-4 py-8">
          <div className="w-full max-w-md bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden p-8">
            
            {/* Logo header */}
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-xl shadow-sm">
                  R
                </div>
                <span className="text-2xl font-bold tracking-tight text-gray-900 animate-fadeIn">
                  Retail<span className="text-[#3B82F6]">Chain</span>
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-2 text-center font-medium">
                Hệ thống Quản lý Chuỗi Bán lẻ
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* Email Input */}
              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Email
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mật khẩu
                  </label>
                  <a
                    href="#forgot"
                    className="text-xs font-semibold text-[#3B82F6] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Chức năng "Quên mật khẩu" sẽ được cấu hình bởi quản trị viên hệ thống của RetailChain.');
                    }}
                  >
                    Quên mật khẩu?
                  </a>
                </div>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg font-semibold text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 transition flex items-center justify-center ${
                  isSubmitting ? 'opacity-85 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              {/* Secure Inline Error State */}
              {error && (
                <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-3 transition">
                  <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

            </form>

            {/* Test Credentials Sandbox Portal */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">
                Cổng thử nghiệm vai trò (Sandbox Demo)
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('manager@test.com')}
                  className="text-left w-full px-3 py-2 rounded-lg hover:bg-blue-50/50 text-xs font-medium text-gray-600 border border-gray-200 hover:border-blue-200 transition"
                >
                  Quản lý: <span className="text-[#3B82F6] font-bold font-mono">manager@test.com</span>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center text-[10px] text-gray-400">
              Thông tin đăng nhập được cấp bởi Trưởng phòng nhân sự.<br />
              Hỗ trợ kỹ thuật: <span className="font-semibold text-gray-500">admin@retailchain.vn</span>
            </div>
          </div>
        </div>
      ) : (
        
        // 2. Active Application layout
        <div className="flex-1 flex flex-col md:flex-row">
          
          {/* LEFT SIDEBAR NAVIGATION */}
          <aside className={`bg-gray-900 text-gray-400 w-64 flex-shrink-0 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 translates-x-0' : 'hidden md:flex'
          }`}>
            <div>
              {/* Sidebar Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    R
                  </div>
                  <span className="text-xl font-extrabold tracking-tight text-white">
                    Retail<span className="text-[#3B82F6]">Chain</span>
                  </span>
                </div>
                {mobileMenuOpen && (
                  <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Role Indicator Banner */}
              <div className="px-6 py-4 border-b border-gray-800 bg-gray-950/40">
                <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest block">Phân hệ làm việc</span>
                <span className="text-xs font-bold text-white mt-0.5 block">{userRole}</span>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="p-4 space-y-1.5" id="sidebar-navigation">
                
                {/* Manager Sidebar View links */}
                {userRole === 'Quản lý' && [
                  { name: 'Tổng quan', icon: LayoutDashboard },
                  { name: 'Sản phẩm', icon: ShoppingBag },
                  { name: 'Đơn nhập hàng', icon: PackageCheck },
                  { name: 'Nhân viên', icon: Users },
                  { name: 'Khách hàng', icon: UserCheck },
                  { name: 'Khuyến mãi', icon: Gift },
                  { name: 'Chi nhánh', icon: StoreIcon },
                  { name: 'Tài khoản', icon: Shield },
                  { name: 'Báo cáo', icon: FileText }
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveTab(item.name);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === item.name 
                          ? 'bg-[#3B82F6] text-white shadow-sm shadow-[#3B82F6]/30' 
                          : 'hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}

                {/* Staff-only Sidebar menu */}
                {userRole === 'Nhân viên bán hàng' && [
                  { name: 'Bán hàng', icon: ShoppingCart },
                  { name: 'Khách hàng', icon: UserCheck },
                  { name: 'Lịch sử đơn hàng', icon: FileText }
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveTab(item.name);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === item.name 
                          ? 'bg-[#3B82F6] text-white' 
                          : 'hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}

                {/* Warehouse-only Sidebar menu */}
                {userRole === 'Nhân viên kho' && [
                  { name: 'Tồn kho', icon: Boxes },
                  { name: 'Đơn nhập hàng', icon: PackageCheck },
                  { name: 'Điều chuyển hàng', icon: RefreshCw }
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        setActiveTab(item.name);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold transition ${
                        activeTab === item.name 
                          ? 'bg-[#3B82F6] text-white' 
                          : 'hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-4.5 h-4.5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}

              </nav>
            </div>

            {/* Logout button bottom */}
            <div className="p-4 border-t border-gray-800 bg-gray-950/20">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span>Đăng xuất hệ thống</span>
              </button>
            </div>
          </aside>

          {/* MAIN WORKSPACE AREA */}
          <div className="flex-1 flex flex-col overflow-x-hidden" id="main-workspace-box">
            
            {/* TOP NAVBAR */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm" id="top-navbar">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="md:hidden text-gray-500 hover:text-gray-900 transition"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-base font-bold text-gray-950 tracking-tight">
                  {userRole} &bull; <span className="text-gray-500 font-medium text-xs">Màn hình {activeTab}</span>
                </h1>
              </div>

              {/* User Info details */}
              <div className="flex items-center space-x-4 text-xs">
                <div className="text-right hidden sm:block">
                  <span className="block font-bold text-gray-900">{currentUser?.fullName || 'Nguyễn Văn A'}</span>
                  <span className="block text-[10px] text-gray-400 font-medium font-mono">
                    {currentUser?.id || 'NV001'} &bull; {userRole || 'Quản lý'}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-full bg-blue-100 text-[#3B82F6] flex items-center justify-center font-bold tracking-tight">
                  {currentUser?.fullName ? currentUser.fullName.split(' ').slice(-1)[0][0] : 'Q'}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-red-600 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* MAIN CONTENT WORKSPACE VIEW CONTROLLER */}
            <main className="flex-grow p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto" id="workspace-content">
              
              {/* Render view dynamically based on navigation & role */}

              {/* --- MANAGER ROLE VIEW REDIRECTS --- */}
              {userRole === 'Quản lý' && (
                <>
                  {activeTab === 'Tổng quan' && (
                    <DashboardOverview 
                      invoices={invoices} 
                      products={products} 
                      storesCount={initialStores.length}
                      onNavigate={(tab) => {
                        if (['Sản phẩm', 'Chi nhánh', 'Báo cáo'].includes(tab)) {
                          setActiveTab(tab);
                        }
                      }}
                    />
                  )}
                  {activeTab === 'Sản phẩm' && (
                    <ProductManagement 
                      products={products} 
                      categories={categories}
                      onAddProduct={handleAddProduct}
                      onUpdateProduct={handleUpdateProduct} 
                      onDeleteProduct={handleDeleteProduct}
                      onSearch={handleSearchProducts}
                    />
                  )}
                  {activeTab === 'Đơn nhập hàng' && (
                    <WarehouseManagement
                      products={products}
                      purchaseOrders={purchaseOrders}
                      stores={initialStores}
                      activeTab="Đơn nhập hàng"
                      userRole={userRole}
                      onConfirmPurchaseOrder={handleConfirmPurchaseOrder}
                      onAdjustStock={(productId, newStock) => {
                        setProducts(prev => prev.map(p =>
                          p.productId === productId ? { ...p, stock: newStock } : p
                        ));
                      }}
                      onAddNewPurchaseOrder={(po) => setPurchaseOrders([po, ...purchaseOrders])}
                    />
                  )}
                  {activeTab === 'Nhân viên' && (
                    <EmployeeManagement 
                      employees={employees} 
                      stores={initialStores}
                      onAddEmployee={handleAddEmployee}
                      onUpdateEmployee={handleUpdateEmployee}
                      onDeleteEmployee={handleDeleteEmployee}
                    />
                  )}
                  {activeTab === 'Khách hàng' && (
                    <CustomerManagement 
                      customers={customers} 
                      onAddCustomer={handleAddCustomer}
                      invoices={invoices}
                    />
                  )}
                  {activeTab === 'Khuyến mãi' && (
                    <PromotionManagement 
                      promotions={promotions} 
                      onAddPromotion={handleAddPromotion}
                    />
                  )}
                  {activeTab === 'Chi nhánh' && (
                    <StoreManagement 
                      stores={initialStores} 
                      employees={employees}
                      invoices={invoices}
                    />
                  )}
                  {activeTab === 'Tài khoản' && (
                    <AccountManagement 
                      employees={employees} 
                      stores={initialStores} 
                    />
                  )}
                  {activeTab === 'Báo cáo' && (
                    <RevenueReport invoices={invoices} products={products} />
                  )}
                </>
              )}

              {/* --- STAFF ROLE VIEW REDIRECTS (Interactive POS Terminal sandbox to show fully functional app) --- */}
              {userRole === 'Nhân viên bán hàng' && (
                <>
                  {activeTab === 'Bán hàng' && (
                    <SalesManagement 
                      products={products}
                      customers={customers}
                      promotions={promotions}
                      currentUser={currentUser}
                      onAddInvoice={handleAddNewInvoice}
                      onUpdateStock={handleUpdateStock}
                      onUpdateCustomerPoints={handleUpdateCustomerPoints}
                    />
                  )}

                  {activeTab === 'Khách hàng' && (
                    <CustomerManagement 
                      customers={customers}
                      onAddCustomer={handleAddCustomer}
                      invoices={invoices}
                    />
                  )}

                  {activeTab === 'Lịch sử đơn hàng' && currentUser && (
                    <OrderHistory currentUser={{ storeId: currentUser.storeId, role: currentUser.role }} />
                  )}
                </>
              )}

              {/* --- WAREHOUSE ROLE VIEW "Tồn kho", "Đơn nhập hàng", and "Điều chuyển hàng" --- */}
              {userRole === 'Nhân viên kho' && (
                <WarehouseManagement
                  products={products}
                  purchaseOrders={purchaseOrders}
                  stores={initialStores}
                  activeTab={activeTab as any}
                  userRole={userRole}
                  onConfirmPurchaseOrder={handleConfirmPurchaseOrder}
                  onAdjustStock={(productId, newStock) => {
                    setProducts(prevProducts => prevProducts.map(p => 
                      p.productId === productId ? { ...p, stock: newStock } : p
                    ));
                  }}
                  onAddNewPurchaseOrder={(po) => setPurchaseOrders([po, ...purchaseOrders])}
                />
              )}

            </main>
          </div>
        </div>
      )}

    </div>
  );
}
