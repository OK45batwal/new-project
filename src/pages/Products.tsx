import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Product } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  AlertTriangle,
  IndianRupee
} from 'lucide-react';

export const Products: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Services',
    hsn_code: '',
    sku: '',
    description: '',
    unit: 'PCS',
    selling_price: 0,
    purchase_price: 0,
    gst_rate: 18,
    cgst_rate: 9,
    sgst_rate: 9,
    stock: 0,
    barcode: '',
    image_url: ''
  });

  const handleGstChange = (val: number) => {
    const rate = Number(val) || 0;
    setFormData(prev => ({
      ...prev,
      gst_rate: rate,
      cgst_rate: rate / 2,
      sgst_rate: rate / 2
    }));
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Goods',
      hsn_code: '',
      sku: '',
      description: '',
      unit: 'PCS',
      selling_price: 0,
      purchase_price: 0,
      gst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
      stock: 0,
      barcode: '',
      image_url: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      category: product.category || 'Goods',
      hsn_code: product.hsn_code || '',
      sku: product.sku || '',
      description: product.description || '',
      unit: product.unit || 'PCS',
      selling_price: Number(product.selling_price) || 0,
      purchase_price: Number(product.purchase_price) || 0,
      gst_rate: Number(product.gst_rate) || 0,
      cgst_rate: Number(product.cgst_rate) || 0,
      sgst_rate: Number(product.sgst_rate) || 0,
      stock: Number(product.stock) || 0,
      barcode: product.barcode || '',
      image_url: product.image_url || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.selling_price < 0) {
      showToast('Product name is required, and selling price must be valid.', 'danger');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
      } else {
        await addProduct(formData);
      }
      setIsFormOpen(false);
    } catch (e: any) {
      showToast(e.message, 'danger');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteProduct(deleteConfirmId);
        setDeleteConfirmId(null);
      } catch (e: any) {
        showToast(e.message, 'danger');
      }
    }
  };

  // Filtered product list
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.hsn_code && p.hsn_code.includes(searchQuery));
      
    const matchesCategory = 
      categoryFilter === 'ALL' ? true : p.category === categoryFilter;
      
    const stockNum = Number(p.stock) || 0;
    const matchesStock = 
      stockFilter === 'ALL' ? true :
      stockFilter === 'IN_STOCK' ? stockNum > 10 :
      stockFilter === 'LOW_STOCK' ? (stockNum > 0 && stockNum <= 10) :
      stockNum === 0; // OUT_OF_STOCK
      
    return matchesSearch && matchesCategory && matchesStock;
  });

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value || 0);
  };

  const units = ['PCS', 'BOX', 'KG', 'LTR', 'MTR', 'NOS', 'BAG', 'DOZ', 'SET', 'UNT'];
  const categories = ['Goods', 'Services', 'Electronics', 'Apparel', 'Food & Beverages', 'Hardware', 'Software', 'Others'];

  return (
    <div className="space-y-6 pb-12 animate-fade-slide-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-soft flex items-center justify-between hover-lift">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Catalog Items</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{products.length}</h2>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-soft flex items-center justify-between hover-lift">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Inventory Value</span>
            <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatRupee(products.reduce((sum, p) => sum + (Number(p.selling_price) || 0) * (Number(p.stock) || 0), 0))}
            </h2>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-soft flex items-center justify-between hover-lift">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Low / Out of Stock</span>
            <h2 className="text-2xl font-black text-rose-500">
              {products.filter(p => Number(p.stock) <= 10).length}
            </h2>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search, Action, and Advanced Filters Bar */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center">
        <div className="flex flex-col md:flex-row gap-3 flex-grow xl:max-w-4xl">
          {/* Search bar */}
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search catalog by name, sku, HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Category Filter Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-400"
            >
              <option value="ALL">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Stock Filter Pills */}
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all
                  ${stockFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-slate-200 shadow-soft'
                    : 'text-text-secondary dark:text-slate-400 hover:text-text-primary'
                  }
                `}
              >
                All Stock
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all
                  ${stockFilter === 'IN_STOCK'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-450 shadow-soft'
                    : 'text-text-secondary dark:text-slate-400 hover:text-text-primary'
                  }
                `}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('LOW_STOCK')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all
                  ${stockFilter === 'LOW_STOCK'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-450 shadow-soft'
                    : 'text-text-secondary dark:text-slate-400 hover:text-text-primary'
                  }
                `}
              >
                Low
              </button>
              <button
                type="button"
                onClick={() => setStockFilter('OUT_OF_STOCK')}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all
                  ${stockFilter === 'OUT_OF_STOCK'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-450 shadow-soft'
                    : 'text-text-secondary dark:text-slate-400 hover:text-text-primary'
                  }
                `}
              >
                Out
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="h-10 px-4 flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm shadow-soft hover:shadow-premium transition-all duration-200"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>Add Product Item</span>
        </button>
      </div>

      {/* Product Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-4 pl-6">Product details</th>
                <th className="py-4">Category / Unit</th>
                <th className="py-4">Stock level</th>
                <th className="py-4">Pricing (Selling / Purchase)</th>
                <th className="py-4">Tax / GST Details</th>
                <th className="py-4">HSN Code</th>
                <th className="py-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(prod => {
                  const stockNum = Number(prod.stock) || 0;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 pl-6">
                        <div className="font-extrabold text-sm text-text-primary dark:text-slate-200">{prod.name}</div>
                        {prod.sku && (
                          <div className="text-[10px] font-mono text-text-secondary dark:text-slate-400 mt-0.5">SKU: {prod.sku}</div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-text-secondary dark:text-slate-400 rounded-md">
                            {prod.category}
                          </span>
                          <span className="text-[10px] font-semibold text-text-light dark:text-slate-500">({prod.unit})</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border
                            ${stockNum > 10 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400' 
                              : stockNum > 0 
                              ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400'
                              : 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-800/30 dark:text-rose-400'
                            }
                          `}>
                            {stockNum} {prod.unit}
                          </span>
                          {stockNum <= 10 && (
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">
                              {stockNum === 0 ? 'Out of stock' : 'Low stock'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="text-xs font-extrabold text-text-primary dark:text-slate-200">
                          {formatRupee(prod.selling_price)}
                        </div>
                        {prod.purchase_price !== undefined && prod.purchase_price > 0 && (
                          <div className="text-[10px] text-text-secondary dark:text-slate-500 mt-0.5">
                            Cost: {formatRupee(prod.purchase_price || 0)}
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {prod.gst_rate}% GST
                        </div>
                        <div className="text-[9px] text-text-secondary dark:text-slate-500 mt-0.5">
                          CGST: {prod.cgst_rate}% | SGST: {prod.sgst_rate}%
                        </div>
                      </td>
                      <td className="py-4">
                        {prod.hsn_code ? (
                          <span className="font-mono text-xs font-bold bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 text-text-primary dark:text-slate-300">
                            {prod.hsn_code}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-light dark:text-slate-500 italic">None</span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-100 hover:text-text-primary dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(prod.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Package className="h-10 w-10 text-text-light dark:text-slate-650 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-text-primary dark:text-slate-200">No Inventory Items</h3>
                    <p className="text-xs text-text-secondary dark:text-slate-500 mt-1">Try matching another query or change the filter status.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingProduct ? "Edit Product Details" : "Add New Product Item"}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-card active:scale-95 transition-all"
            >
              {editingProduct ? "Update Product" : "Save Product"}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Unit of Measurement</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              >
                {units.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">HSN Code (Indian Tax standard)</label>
              <input
                type="text"
                placeholder="e.g. 8471"
                value={formData.hsn_code}
                onChange={(e) => setFormData(prev => ({ ...prev, hsn_code: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">SKU / Item Code</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Selling Price (₹) *</label>
              <input
                type="number"
                required
                min={0}
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Purchase Price (₹)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_price: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">GST Rate (%)</label>
              <select
                value={formData.gst_rate}
                onChange={(e) => handleGstChange(Number(e.target.value))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              >
                <option value={0}>0% (Exempt)</option>
                <option value={3}>3% (Precious Metals)</option>
                <option value={5}>5% (Basic goods)</option>
                <option value={12}>12% (Standard rate)</option>
                <option value={18}>18% (Most items/services)</option>
                <option value={28}>28% (Luxury goods)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider mb-1">CGST (%)</label>
                <input
                  type="text"
                  readOnly
                  value={`${formData.cgst_rate}%`}
                  className="w-full h-10 px-3 text-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-500 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider mb-1">SGST (%)</label>
                <input
                  type="text"
                  readOnly
                  value={`${formData.sgst_rate}%`}
                  className="w-full h-10 px-3 text-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-500 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Initial Stock Quantity</label>
              <input
                type="number"
                min={0}
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Barcode / Serial</label>
              <input
                type="text"
                placeholder="Scanner input ready"
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1.5">Item Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              />
            </div>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary dark:text-slate-200">Delete Product Record?</h4>
              <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">This will permanently remove the item from your catalog. It will not affect past invoices, which store snapshot data, but will disable search auto-fill for this item.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-50 dark:border-slate-850">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              No, Keep
            </button>
            <button
              onClick={handleDelete}
              className="h-10 px-5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-soft transition-colors"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
