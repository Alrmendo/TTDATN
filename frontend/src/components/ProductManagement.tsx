import { useState, FormEvent } from 'react';
import { Product } from '../types';
import { Search, Plus, Filter, AlertTriangle, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductManagementProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
  // Let's add an optional call back to toggle status
  onToggleStatus?: (id: string) => void;
}

export default function ProductManagement({ products, onAddProduct, onDeleteProduct }: ProductManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Edit/toggle status local override database simulation
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'Đang kinh doanh' | 'Ngừng kinh doanh'>>({});

  // New product form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Thực phẩm khô');
  const [price, setPrice] = useState(0);
  const [cost, setCost] = useState(0);
  const [stock, setStock] = useState(0);

  const categories = ['Tất cả', ...Array.from(new Set(products.map(p => p.category)))];

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const filteredProducts = products.map(p => ({
    ...p,
    status: localStatuses[p.productId] !== undefined ? localStatuses[p.productId] : (p.status || 'Đang kinh doanh')
  })).filter(p => {
    const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase()) || p.productId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Guard current page when total items changes
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || price <= 0 || cost <= 0) return;

    const newId = `SP0${products.length + 1}`;
    onAddProduct({
      productId: newId,
      productName: name,
      category,
      price: Number(price),
      cost: Number(cost),
      stock: Number(stock),
      status: 'Đang kinh doanh'
    });

    // Reset form
    setName('');
    setCategory('Thực phẩm khô');
    setPrice(0);
    setCost(0);
    setStock(0);
    setIsAdding(false);
  };

  const handleToggleStatus = (id: string) => {
    const currentStatus = localStatuses[id] || products.find(p => p.productId === id)?.status || 'Đang kinh doanh';
    const nextStatus = currentStatus === 'Đang kinh doanh' ? 'Ngừng kinh doanh' : 'Đang kinh doanh';
    setLocalStatuses({
      ...localStatuses,
      [id]: nextStatus
    });
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950 tracking-tight" id="page-title-sp">Quản lý sản phẩm</h2>
          <p className="text-xs text-gray-500 mt-1">Quản lý danh mục hàng hóa, đơn giá bán, trạng thái kinh doanh toàn bộ hệ thống chuỗi cửa hàng</p>
        </div>
      </div>

      {/* Top action bar: search, category and add button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="search-input-product"
            type="text"
            placeholder="Tìm theo tên hoặc mã sản phẩm"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6] transition"
          />
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 border border-gray-300 rounded-lg bg-white px-3 py-1.5 text-xs text-gray-600">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-gray-500">Danh mục:</span>
            <select
              id="filter-category-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="bg-transparent font-bold focus:outline-none text-xs text-gray-700 cursor-pointer"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            id="btn-add-product-sp"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-[#3B82F6] hover:bg-blue-600 text-white rounded-lg transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      {/* Add Product Modular drawer */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-md max-w-2xl animate-fadeIn transition duration-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Thêm sản phẩm mới</h3>
            <button 
              onClick={() => setIsAdding(false)}
              className="text-[#3B82F6] hover:text-blue-700 font-semibold text-xs animate-pulse"
            >
              Đóng Form (X)
            </button>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 md:col-span-2">
              <label className="block font-semibold text-gray-700">Tên sản phẩm</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full border border-gray-300 rounded-md p-2"
                placeholder="Nhập tên sản phẩm (ví dụ: Sữa đặc Ông Thọ đỏ)"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Danh mục sản phẩm</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full border border-gray-300 rounded-md p-2 bg-white"
              >
                <option value="Thực phẩm khô">Thực phẩm khô</option>
                <option value="Gia vị">Gia vị</option>
                <option value="Sữa & Sản phẩm từ sữa">Sữa & Sản phẩm từ sữa</option>
                <option value="Đồ uống">Đồ uống</option>
                <option value="Hóa mỹ phẩm">Hóa mỹ phẩm</option>
                <option value="Gia dụng">Gia dụng</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Đơn giá bán (₫)</label>
              <input
                type="number"
                required
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="block w-full border border-gray-300 rounded-md p-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Giá vốn nhập (₫)</label>
              <input
                type="number"
                required
                min="0"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="block w-full border border-gray-300 rounded-md p-2"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-gray-700">Số lượng tồn ban đầu</label>
              <input
                type="number"
                required
                min="0"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="block w-full border border-gray-300 rounded-md p-2"
              />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#3B82F6] hover:bg-blue-600 font-semibold text-white rounded-lg shadow-xs"
              >
                Lưu sản phẩm
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Critical warning state block */}
      {products.filter(p => p.stock <= 4).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.filter(p => p.stock <= 4).slice(0, 3).map(p => (
            <div key={p.productId} className="flex items-center space-x-3 p-3 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-4.5 h-4.5 text-red-500 animate-pulse shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-red-950 truncate max-w-[200px]" title={p.productName}>{p.productName}</p>
                <p className="text-[10px] text-red-600">Tồn kho còn <span className="font-bold">{p.stock}</span>! Cần lập đơn nhập hàng bổ sung gấp.</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Core Product Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto text-[13px]">
          <table className="w-full text-left text-xs text-gray-600 border-collapse" id="product-list-table">
            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Mã SP</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Tên sản phẩm</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100">Danh mục</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100 text-right">Giá bán</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100 text-center">Trạng thái</th>
                <th scope="col" className="px-5 py-3.5 border-b border-gray-100 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {currentProducts.map((p) => {
                const isUnderStock = p.stock <= 5;
                return (
                  <tr key={p.productId} className="hover:bg-gray-50/70 transition" id={`row-sp-${p.productId}`}>
                    <td className="px-5 py-3.5 text-[#3B82F6] font-bold font-mono text-[11px]">{p.productId}</td>
                    <td className="px-5 py-3.5 text-gray-950 font-bold">
                      <div className="flex flex-col">
                        <span>{p.productName}</span>
                        {isUnderStock && (
                          <span className="text-[9px] text-amber-600 font-medium flex items-center mt-0.5">
                            ⚠️ tồn kho tối thiểu ({p.stock} sản phẩm)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-full text-[10px] text-gray-600 font-bold">{p.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-950 font-bold font-mono">{formatVND(p.price)}</td>
                    
                    {/* Required status column: green badg or red badge */}
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'Đang kinh doanh'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          p.status === 'Đang kinh doanh' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        {p.status}
                      </span>
                    </td>

                    {/* Action buttons: Edit icon (toggles status) & Delete icon */}
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex justify-center items-center space-x-1.5">
                        <button 
                          onClick={() => handleToggleStatus(p.productId)}
                          title="Đổi trạng thái kinh doanh (Sửa)"
                          className="p-1 px-1.5 hover:bg-blue-50 text-gray-400 hover:text-[#3B82F6] rounded transition flex items-center space-x-1 text-[11px] font-semibold border border-transparent hover:border-blue-100"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>
                        <button 
                          onClick={() => onDeleteProduct(p.productId)}
                          title="Xóa khỏi kệ hàng"
                          className="p-1 px-1.5 hover:bg-rose-50 text-gray-400 hover:text-red-600 rounded transition flex items-center space-x-1 text-[11px] font-semibold border border-transparent hover:border-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {currentProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 font-medium">
                    Không tìm thấy sản phẩm nào phù hợp với điều kiện lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Real Bottom Pagination */}
        <div className="bg-white px-5 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 gap-4 text-xs font-medium">
          <div className="text-gray-500">
            Hiển thị <span className="font-semibold text-gray-900">{totalItems > 0 ? indexOfFirstItem + 1 : 0}</span> đến{' '}
            <span className="font-semibold text-gray-900">{Math.min(indexOfLastItem, totalItems)}</span> trong số{' '}
            <span className="font-semibold text-gray-900">{totalItems}</span> sản phẩm
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={activePage === 1}
              className={`p-1.5 rounded-md border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition ${
                activePage === 1 ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-md text-xs font-bold transition ${
                  activePage === pageNum
                    ? 'bg-[#3B82F6] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={activePage === totalPages || totalPages === 0}
              className={`p-1.5 rounded-md border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition ${
                activePage === totalPages || totalPages === 0 ? 'opacity-50 cursor-not-allowed hover:bg-white' : ''
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
