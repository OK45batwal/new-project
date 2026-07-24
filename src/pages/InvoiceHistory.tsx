import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { prefetchCache } from '../services/prefetchCache';
import { Invoice } from '../types';
import { api } from '../services/api';
import { Dialog } from '../components/ui/Dialog';
import { ShareDialog } from '../components/invoices/ShareDialog';
import { 
  Search, 
  Trash2, 
  Copy, 
  Edit, 
  AlertTriangle,
  Receipt,
  Share2
} from 'lucide-react';

export const InvoiceHistory: React.FC = () => {
  const { 
    invoices, 
    deleteInvoice, 
    setActivePage, 
    setSelectedInvoiceIdForEdit, 
    showToast,
    refreshData 
  } = useApp();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // UI states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shareInvoice, setShareInvoice] = useState<Invoice | null>(null);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);

  // Apply filters on invoices list
  useEffect(() => {
    let result = [...invoices];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(i => 
        i.invoice_number.toLowerCase().includes(q) ||
        i.customer_snapshot.name.toLowerCase().includes(q) ||
        (i.customer_snapshot.company_name && i.customer_snapshot.company_name.toLowerCase().includes(q))
      );
    }

    if (typeFilter) {
      result = result.filter(i => i.invoice_type === typeFilter);
    }

    if (statusFilter) {
      result = result.filter(i => i.payment_status === statusFilter);
    }

    if (startDate) {
      result = result.filter(i => i.invoice_date >= startDate);
    }

    if (endDate) {
      result = result.filter(i => i.invoice_date <= endDate);
    }

    setFilteredInvoices(result);
  }, [invoices, searchQuery, typeFilter, statusFilter, startDate, endDate]);

  const handleEdit = (inv: Invoice) => {
    setSelectedInvoiceIdForEdit(inv.id || null);
    setActivePage(inv.invoice_type === 'GST' ? 'gst-invoice' : 'nongst-invoice');
  };

  const handleDuplicate = async (inv: Invoice) => {
    const { id: _id, invoice_number: _invoice_number, created_at: _created_at, ...duplicateData } = inv;
    
    // Create new unique invoice number
    const prefix = inv.invoice_type === 'GST' ? 'GST-' : 'BILL-';
    const year = new Date().getFullYear();
    const uniqueId = String(Math.floor(Math.random() * 9000) + 1000);
    const newNumber = `${prefix}${year}-${uniqueId}-DUP`;

    const duplicatePayload = {
      ...duplicateData,
      invoice_number: newNumber,
      invoice_date: new Date().toISOString().split('T')[0]
    };

    try {
      await api.createInvoice(duplicatePayload);
      showToast(`Invoice duplicated as ${newNumber}!`, 'success');
      refreshData();
    } catch (e: any) {
      showToast(e.message, 'danger');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      try {
        await deleteInvoice(deleteConfirmId);
        setDeleteConfirmId(null);
      } catch (e: any) {
        showToast(e.message, 'danger');
      }
    }
  };

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-soft space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4.5 w-4.5 text-text-light dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search by invoice number, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-sm bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-200"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-primary dark:text-slate-200 font-normal"
            >
              <option value="">All Types</option>
              <option value="GST">GST Invoice</option>
              <option value="Non-GST">Non-GST Invoice</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 text-sm bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-text-primary dark:text-slate-200 font-normal"
            >
              <option value="">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <div className="relative flex-grow">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-400 font-normal"
                title="Start Date"
              />
            </div>
            <span className="text-text-light dark:text-slate-500 font-medium">to</span>
            <div className="relative flex-grow">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-400 font-normal"
                title="End Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Grid Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-4">
        <div className="flex justify-between items-center pb-2">
          <h3 className="text-sm uppercase font-bold tracking-wider text-text-secondary dark:text-slate-400">Invoice History Registry</h3>
          <span className="text-xs text-text-light dark:text-slate-500 font-normal">Showing {filteredInvoices.length} invoices</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-medium text-text-secondary dark:text-slate-400 uppercase tracking-wider">
                <th className="pb-3.5 pl-2">Invoice No</th>
                <th className="pb-3.5">Customer / Company</th>
                <th className="pb-3.5">Type</th>
                <th className="pb-3.5">Date</th>
                <th className="pb-3.5">Total Value</th>
                <th className="pb-3.5">Payment</th>
                <th className="pb-3.5 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850 font-normal">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    onMouseEnter={() => prefetchCache.prefetchInvoiceDetails(inv)}
                    onFocus={() => prefetchCache.prefetchInvoiceDetails(inv)}
                    className="text-sm text-text-primary dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-4 font-bold pl-2">
                      {inv.invoice_number}
                      {inv.id?.startsWith('draft_') && (
                        <span className="ml-1.5 px-2 py-0.5 text-[9px] font-medium uppercase border border-amber-250 bg-amber-50 text-amber-600 rounded-full dark:bg-amber-950/20 dark:border-amber-800/20">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <div className="font-normal text-text-primary dark:text-slate-200">{inv.customer_snapshot.name}</div>
                      <div className="text-[10px] text-text-secondary dark:text-slate-500">
                        {inv.customer_snapshot.company_name || 'Individual'} | {inv.customer_snapshot.mobile}
                      </div>
                    </td>
                    <td className="py-4 text-xs font-normal text-text-secondary dark:text-slate-400">
                      {inv.invoice_type}
                    </td>
                    <td className="py-4 text-xs text-text-secondary dark:text-slate-400">
                      {new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 font-bold text-text-primary dark:text-slate-100">
                      {formatRupee(inv.grand_total)}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex px-2 py-1 rounded-full text-[9px] font-medium uppercase border
                        ${inv.payment_status === 'Paid' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:border-emerald-800/30 dark:text-emerald-400' 
                          : inv.payment_status === 'Partially Paid' 
                          ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/20 dark:border-amber-800/30 dark:text-amber-400'
                          : 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:border-rose-800/30 dark:text-rose-400'
                        }
                      `}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(inv)}
                          className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-50 hover:text-text-primary dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                          title="Manage & Print"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(inv)}
                          className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-50 hover:text-text-primary dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                          title="Duplicate Invoice"
                        >
                          <Copy className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => setShareInvoice(inv)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/20 transition-colors"
                          title="Share Invoice"
                        >
                          <Share2 className="h-4.5 w-4.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(inv.id || null)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:text-rose-450 dark:hover:bg-rose-950/20 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-text-secondary dark:text-slate-400">
                    <Receipt className="h-10 w-10 text-text-light dark:text-slate-600 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-text-primary dark:text-slate-200">No Invoices Found</h4>
                    <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Adjust your filters or generate a new invoice to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={shareInvoice !== null}
        onClose={() => setShareInvoice(null)}
        invoice={shareInvoice || {} as Invoice}
        items={shareInvoice?.items || []}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Registered Invoice"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary dark:text-slate-200">Delete Invoice permanently?</h4>
              <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">This will delete the invoice registry record. This action CANNOT be undone. Product stock adjusted during creation will not be automatically restored.</p>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-50 dark:border-slate-850">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 font-semibold text-xs transition-colors"
            >
              Cancel
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
