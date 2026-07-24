import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { Dialog } from '../components/ui/Dialog';
import { INDIAN_STATES } from '../utils/gstEngine';
import { 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  Building, 
  History, 
  AlertTriangle,
  Users
} from 'lucide-react';

export const Customers: React.FC = () => {
  const { 
    customers, 
    invoices, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'GST' | 'REGULAR'>('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedCustomerHistory, setSelectedCustomerHistory] = useState<Customer | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    gstin: '',
    pan: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    country: 'India',
    email: '',
    mobile: '',
    notes: ''
  });

  // Automatically update state code when state is chosen
  const handleStateChange = (stateName: string) => {
    const matchedState = INDIAN_STATES.find(s => s.name === stateName);
    setFormData(prev => ({
      ...prev,
      state: stateName,
      state_code: matchedState ? matchedState.code : ''
    }));
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      company_name: '',
      gstin: '',
      pan: '',
      address: '',
      city: '',
      state: 'Maharashtra',
      state_code: '27',
      country: 'India',
      email: '',
      mobile: '',
      notes: ''
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      company_name: customer.company_name || '',
      gstin: customer.gstin || '',
      pan: customer.pan || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || 'Maharashtra',
      state_code: customer.state_code || '27',
      country: customer.country || 'India',
      email: customer.email || '',
      mobile: customer.mobile || '',
      notes: customer.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile || !formData.address) {
      showToast('Name, mobile, and address are required.', 'danger');
      return;
    }

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await addCustomer(formData);
      }
      setIsFormOpen(false);
    } catch (e: any) {
      showToast(e.message, 'danger');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteCustomer(deleteConfirmId);
        setDeleteConfirmId(null);
      } catch (e: any) {
        showToast(e.message, 'danger');
      }
    }
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.mobile.includes(searchQuery);
      
    const matchesType = 
      typeFilter === 'ALL' ? true :
      typeFilter === 'GST' ? !!c.gstin :
      !c.gstin;
      
    return matchesSearch && matchesType;
  });

  // Invoices list for history
  const getCustomerInvoices = (customerId: string) => {
    return invoices.filter(inv => inv.customer_id === customerId);
  };

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-slide-up">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-soft flex items-center justify-between hover-lift">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Customers</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{customers.length}</h2>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-soft flex items-center justify-between hover-lift">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">GST Registered</span>
            <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{customers.filter(c => c.gstin).length}</h2>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Building className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-soft flex items-center justify-between hover-lift">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Regular (Non-GST)</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">{customers.filter(c => !c.gstin).length}</h2>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search and Filter Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-col sm:flex-row gap-3 flex-grow max-w-xl">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search customers by name, company, mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>

          {/* Type Filter Selector */}
          <div className="flex bg-slate-100/80 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${typeFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-soft'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }
              `}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('GST')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${typeFilter === 'GST'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-soft'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }
              `}
            >
              GST
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('REGULAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                ${typeFilter === 'REGULAR'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-soft'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }
              `}
            >
              Regular
            </button>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="h-10 px-4 flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-card shadow-blue-600/30 btn-glow active:scale-95 transition-all"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          <span>Create Customer</span>
        </button>
      </div>

      {/* Customer Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-text-secondary dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
                <th className="py-4 pl-6">Customer / Company</th>
                <th className="py-4">Contact Info</th>
                <th className="py-4">Location</th>
                <th className="py-4">GSTIN / PAN</th>
                <th className="py-4">Invoiced Details</th>
                <th className="py-4 text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(cust => {
                  const customerInvoices = getCustomerInvoices(cust.id);
                  const totalBilled = customerInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);

                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-4 pl-6">
                        <div className="font-extrabold text-sm text-text-primary dark:text-slate-200">{cust.name}</div>
                        {cust.company_name && (
                          <div className="text-[10px] text-text-secondary dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building className="h-3 w-3 text-text-light" />
                            <span>{cust.company_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="text-xs font-semibold text-text-primary dark:text-slate-200">{cust.mobile}</div>
                        {cust.email && (
                          <div className="text-[10px] text-text-secondary dark:text-slate-400 mt-0.5">{cust.email}</div>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="text-xs font-semibold text-text-primary dark:text-slate-200">{cust.city}</div>
                        <span className="inline-flex mt-0.5 px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-text-secondary dark:text-slate-400 rounded-md">
                          {cust.state}
                        </span>
                      </td>
                      <td className="py-4">
                        {cust.gstin ? (
                          <div className="font-mono text-xs font-bold text-primary dark:text-primary-light">{cust.gstin}</div>
                        ) : (
                          <span className="text-[10px] text-text-light dark:text-slate-500 font-semibold italic">Unregistered</span>
                        )}
                        {cust.pan && (
                          <div className="text-[9px] font-mono font-bold text-text-secondary dark:text-slate-400 mt-0.5">PAN: {cust.pan}</div>
                        )}
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => setSelectedCustomerHistory(cust)}
                          className="flex flex-col items-start text-left group"
                        >
                          <div className="text-xs font-bold text-primary dark:text-primary-light group-hover:underline flex items-center gap-1">
                            <History className="h-3.5 w-3.5" />
                            <span>{customerInvoices.length} invoices</span>
                          </div>
                          <span className="text-[10px] text-text-secondary dark:text-slate-400 font-bold mt-0.5">
                            Total: ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </button>
                      </td>
                      <td className="py-4 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(cust)}
                            className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-100 hover:text-text-primary dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Customer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(cust.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/20 transition-colors"
                            title="Delete Customer"
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
                  <td colSpan={6} className="text-center py-16">
                    <Users className="h-10 w-10 text-text-light dark:text-slate-650 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-text-primary dark:text-slate-200">No Customers Found</h3>
                    <p className="text-xs text-text-secondary dark:text-slate-500 mt-1">Try matching another query or change the filter status.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Form Dialog */}
      <Dialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingCustomer ? "Edit Customer Details" : "Create New Customer"}
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
              form="customer-form"
              className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-card active:scale-95 transition-all"
            >
              {editingCustomer ? "Update Customer" : "Save Customer"}
            </button>
          </>
        }
      >
        <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Customer Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Company Name</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number *</label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">GSTIN</label>
              <input
                type="text"
                placeholder="e.g. 27AAAAA0000A1Z5"
                value={formData.gstin}
                onChange={(e) => setFormData(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                maxLength={15}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">PAN Number</label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={formData.pan}
                onChange={(e) => setFormData(prev => ({ ...prev, pan: e.target.value.toUpperCase() }))}
                maxLength={10}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-mono font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Billing Address *</label>
              <textarea
                required
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">State *</label>
              <select
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">State Code</label>
              <input
                type="text"
                readOnly
                value={formData.state_code}
                className="w-full h-10 px-3.5 text-sm border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none text-slate-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Additional Notes</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white font-medium"
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
              <h4 className="text-sm font-bold text-text-primary dark:text-slate-200">Delete Customer Account?</h4>
              <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">This will permanently remove the customer record. Any historical invoices created for this customer will retain their snapshots but will lose the link to this customer record.</p>
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

      {/* Customer Invoice History Dialog */}
      <Dialog
        isOpen={selectedCustomerHistory !== null}
        onClose={() => setSelectedCustomerHistory(null)}
        title={selectedCustomerHistory ? `${selectedCustomerHistory.name}'s Invoice History` : 'Customer History'}
        size="lg"
      >
        {selectedCustomerHistory && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs font-semibold text-text-secondary dark:text-slate-400 justify-between items-center">
              <div>
                <span className="text-text-light dark:text-slate-500 mr-1.5">Total Invoices Billed:</span>
                <span className="text-text-primary dark:text-slate-200 font-extrabold">{getCustomerInvoices(selectedCustomerHistory.id).length}</span>
              </div>
              <div>
                <span className="text-text-light dark:text-slate-500 mr-1.5">Total Sales Revenue:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {formatRupee(getCustomerInvoices(selectedCustomerHistory.id).reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0))}
                </span>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-800/80 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                    <th className="py-2.5 pl-3">Invoice No</th>
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5 pr-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                  {getCustomerInvoices(selectedCustomerHistory.id).length > 0 ? (
                    getCustomerInvoices(selectedCustomerHistory.id).map(inv => (
                      <tr key={inv.id} className="text-text-primary dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="py-3 pl-3 font-semibold">{inv.invoice_number}</td>
                        <td className="py-3 text-text-secondary dark:text-slate-400">
                          {new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3">{inv.invoice_type}</td>
                        <td className="py-3 font-bold text-text-primary dark:text-slate-200">{formatRupee(inv.grand_total)}</td>
                        <td className="py-3 pr-3 text-right">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase border
                            ${inv.payment_status === 'Paid' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/15' 
                              : inv.payment_status === 'Partially Paid' 
                              ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/15'
                              : 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/15'
                            }
                          `}>
                            {inv.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-text-secondary dark:text-slate-400">
                        No transactions registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCustomerHistory(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
