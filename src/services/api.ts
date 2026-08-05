import { BusinessProfile, Customer, Product, Invoice, DashboardStats, ReportData } from '../types';

const getApiBase = () => {
  let url = import.meta.env.VITE_API_URL;
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      url = window.location.origin;
    } else {
      url = 'http://localhost:5001';
    }
  }
  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url.endsWith('/api') ? url : `${url}/api`;
};

const API_BASE = getApiBase();

// Helper to determine if we should fallback to offline mode
let isOfflineMode = false;

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `HTTP error! status: ${res.status}`);
    }
    
    isOfflineMode = false;
    return await res.json() as T;
  } catch (error: any) {
    console.warn(`API call failed for ${url}, checking local storage. Error:`, error.message);
    isOfflineMode = true;
    throw error;
  }
};

// --- LocalStorage offline fallbacks ---
const getLocalDrafts = (): Invoice[] => {
  return JSON.parse(localStorage.getItem('invoiceflow_drafts') || '[]');
};

const saveLocalDraft = (invoice: Invoice): Invoice => {
  const drafts = getLocalDrafts();
  const id = invoice.id || `draft_${Date.now()}`;
  const newInvoice = { ...invoice, id, payment_status: (invoice.payment_status || 'Unpaid') as any };
  
  const existingIdx = drafts.findIndex(d => d.id === id || d.invoice_number === invoice.invoice_number);
  if (existingIdx > -1) {
    drafts[existingIdx] = newInvoice;
  } else {
    drafts.push(newInvoice);
  }
  
  localStorage.setItem('invoiceflow_drafts', JSON.stringify(drafts));
  return newInvoice;
};

const deleteLocalDraft = (id: string) => {
  const drafts = getLocalDrafts();
  const filtered = drafts.filter(d => d.id !== id);
  localStorage.setItem('invoiceflow_drafts', JSON.stringify(filtered));
};

export const api = {
  // Check if server is reachable
  isOffline: () => isOfflineMode,

  // Profile API
  getProfiles: async (): Promise<BusinessProfile[]> => {
    try {
      return await request<BusinessProfile[]>('/profile');
    } catch {
      // Fallback
      const gst = JSON.parse(localStorage.getItem('invoiceflow_profile_GST') || 'null');
      const nongst = JSON.parse(localStorage.getItem('invoiceflow_profile_Non-GST') || 'null');
      const profiles = [];
      if (gst) profiles.push({ ...gst, profile_type: 'GST' });
      if (nongst) profiles.push({ ...nongst, profile_type: 'Non-GST' });
      return profiles;
    }
  },

  updateProfile: async (type: 'GST' | 'Non-GST', profile: BusinessProfile): Promise<BusinessProfile> => {
    try {
      const data = await request<BusinessProfile>(`/profile/${type}`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
      localStorage.setItem(`invoiceflow_profile_${type}`, JSON.stringify(data));
      return data;
    } catch {
      const offlineProfile = { ...profile, profile_type: type };
      localStorage.setItem(`invoiceflow_profile_${type}`, JSON.stringify(offlineProfile));
      return offlineProfile;
    }
  },

  restoreDatabase: async (backupData: any): Promise<void> => {
    await request<any>('/restore', {
      method: 'POST',
      body: JSON.stringify(backupData),
    });
    localStorage.removeItem('invoiceflow_profile_GST');
    localStorage.removeItem('invoiceflow_profile_Non-GST');
  },

  // Customers API
  getCustomers: async (search?: string): Promise<Customer[]> => {
    try {
      return await request<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_customers') || '[]');
      if (search) {
        return local.filter((c: any) => 
          c.name.toLowerCase().includes(search.toLowerCase()) || 
          (c.company_name && c.company_name.toLowerCase().includes(search.toLowerCase())) ||
          c.mobile.includes(search)
        );
      }
      return local;
    }
  },

  createCustomer: async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
    try {
      return await request<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
      });
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_customers') || '[]');
      const newCust = { ...customer, id: `cust_${Date.now()}` } as Customer;
      local.push(newCust);
      localStorage.setItem('invoiceflow_customers', JSON.stringify(local));
      return newCust;
    }
  },

  updateCustomer: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    try {
      return await request<Customer>(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(customer),
      });
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_customers') || '[]');
      const idx = local.findIndex((c: any) => c.id === id);
      if (idx > -1) {
        local[idx] = { ...local[idx], ...customer };
        localStorage.setItem('invoiceflow_customers', JSON.stringify(local));
        return local[idx];
      }
      throw new Error('Customer not found locally');
    }
  },

  deleteCustomer: async (id: string): Promise<void> => {
    try {
      await request<void>(`/customers/${id}`, { method: 'DELETE' });
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_customers') || '[]');
      const filtered = local.filter((c: any) => c.id !== id);
      localStorage.setItem('invoiceflow_customers', JSON.stringify(filtered));
    }
  },

  // Products API
  getProducts: async (search?: string): Promise<Product[]> => {
    try {
      return await request<Product[]>(`/products${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_products') || '[]');
      if (search) {
        return local.filter((p: any) => 
          p.name.toLowerCase().includes(search.toLowerCase()) || 
          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
          (p.barcode && p.barcode.includes(search))
        );
      }
      return local;
    }
  },

  createProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    try {
      return await request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_products') || '[]');
      const newProd = { ...product, id: `prod_${Date.now()}` } as Product;
      local.push(newProd);
      localStorage.setItem('invoiceflow_products', JSON.stringify(local));
      return newProd;
    }
  },

  updateProduct: async (id: string, product: Partial<Product>): Promise<Product> => {
    try {
      return await request<Product>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(product),
      });
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_products') || '[]');
      const idx = local.findIndex((p: any) => p.id === id);
      if (idx > -1) {
        local[idx] = { ...local[idx], ...product };
        localStorage.setItem('invoiceflow_products', JSON.stringify(local));
        return local[idx];
      }
      throw new Error('Product not found locally');
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    try {
      await request<void>(`/products/${id}`, { method: 'DELETE' });
    } catch {
      const local = JSON.parse(localStorage.getItem('invoiceflow_products') || '[]');
      const filtered = local.filter((p: any) => p.id !== id);
      localStorage.setItem('invoiceflow_products', JSON.stringify(filtered));
    }
  },

  // Invoices API
  getNextInvoiceNumber: async (): Promise<string> => {
    try {
      const data = await request<{ next_number: string }>('/invoices/next-number');
      return data.next_number;
    } catch {
      const year = new Date().getFullYear();
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      const count = localSaved.length + 1;
      return `INV-${year}-${String(count).padStart(4, '0')}`;
    }
  },

  getInvoices: async (filters?: { search?: string; type?: string; status?: string; start_date?: string; end_date?: string }): Promise<Invoice[]> => {
    try {
      let url = '/invoices?';
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val) url += `${key}=${encodeURIComponent(val)}&`;
        });
      }
      const serverInvoices = await request<Invoice[]>(url);
      const drafts = getLocalDrafts();
      return [...drafts, ...serverInvoices];
    } catch {
      // Offline: read drafts and mock saved invoices from localStorage
      let local = getLocalDrafts();
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      let combined = [...local, ...localSaved];
      
      if (filters) {
        if (filters.search) {
          const s = filters.search.toLowerCase();
          combined = combined.filter(i => 
            i.invoice_number.toLowerCase().includes(s) ||
            i.customer_snapshot.name.toLowerCase().includes(s) ||
            (i.customer_snapshot.company_name && i.customer_snapshot.company_name.toLowerCase().includes(s))
          );
        }
        if (filters.type) {
          combined = combined.filter(i => i.invoice_type === filters.type);
        }
        if (filters.status) {
          combined = combined.filter(i => i.payment_status === filters.status);
        }
        if (filters.start_date) {
          combined = combined.filter(i => i.invoice_date >= filters.start_date!);
        }
        if (filters.end_date) {
          combined = combined.filter(i => i.invoice_date <= filters.end_date!);
        }
      }
      return combined;
    }
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    if (id.startsWith('draft_')) {
      const drafts = getLocalDrafts();
      const draft = drafts.find(d => d.id === id);
      if (draft) return draft;
      throw new Error('Draft invoice not found');
    }
    
    try {
      return await request<Invoice>(`/invoices/${id}`);
    } catch {
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      const inv = localSaved.find((i: any) => i.id === id);
      if (inv) return inv;
      throw new Error('Invoice not found locally');
    }
  },

  createInvoice: async (invoice: Omit<Invoice, 'id'> & { isDraft?: boolean }): Promise<Invoice> => {
    if (invoice.isDraft) {
      return saveLocalDraft(invoice as Invoice);
    }
    
    try {
      const created = await request<Invoice>('/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      });
      // If it was a draft before, delete the draft
      if ((invoice as any).id && (invoice as any).id.startsWith('draft_')) {
        deleteLocalDraft((invoice as any).id);
      }
      return created;
    } catch {
      // If server is offline, save to local saved invoices
      console.warn('Saving invoice locally since server is offline');
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      const id = (invoice as any).id || `inv_${Date.now()}`;
      const newInv = { ...invoice, id } as Invoice;
      localSaved.push(newInv);
      localStorage.setItem('invoiceflow_saved_invoices', JSON.stringify(localSaved));
      
      if ((invoice as any).id && (invoice as any).id.startsWith('draft_')) {
        deleteLocalDraft((invoice as any).id);
      }
      return newInv;
    }
  },

  updateInvoice: async (id: string, invoice: Partial<Invoice> & { isDraft?: boolean }): Promise<Invoice> => {
    if (invoice.isDraft || id.startsWith('draft_')) {
      return saveLocalDraft({ ...invoice, id } as Invoice);
    }
    
    try {
      return await request<Invoice>(`/invoices/${id}`, {
        method: 'PUT',
        body: JSON.stringify(invoice),
      });
    } catch {
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      const idx = localSaved.findIndex((i: any) => i.id === id);
      if (idx > -1) {
        localSaved[idx] = { ...localSaved[idx], ...invoice };
        localStorage.setItem('invoiceflow_saved_invoices', JSON.stringify(localSaved));
        return localSaved[idx];
      }
      throw new Error('Invoice not found locally');
    }
  },

  deleteInvoice: async (id: string): Promise<void> => {
    if (id.startsWith('draft_')) {
      deleteLocalDraft(id);
      return;
    }
    
    try {
      await request<void>(`/invoices/${id}`, { method: 'DELETE' });
    } catch {
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      const filtered = localSaved.filter((i: any) => i.id !== id);
      localStorage.setItem('invoiceflow_saved_invoices', JSON.stringify(filtered));
    }
  },

  // Dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      return await request<DashboardStats>('/dashboard/stats');
    } catch {
      // Generate stats locally
      const drafts = getLocalDrafts();
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      const combined = [...drafts, ...localSaved];
      
      const customers = JSON.parse(localStorage.getItem('invoiceflow_customers') || '[]');
      const products = JSON.parse(localStorage.getItem('invoiceflow_products') || '[]');
      
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      let todaySales = 0;
      let todayInvoices = 0;
      let monthlySales = 0;
      let totalGstCollected = 0;
      
      combined.forEach(inv => {
        const isBill = ['GST', 'Non-GST'].includes(inv.invoice_type);
        const amount = Number(inv.grand_total) || 0;
        const cgst = Number(inv.cgst_total) || 0;
        const sgst = Number(inv.sgst_total) || 0;
        const igst = Number(inv.igst_total) || 0;
        
        if (inv.invoice_date === today && isBill) {
          todaySales += amount;
          todayInvoices += 1;
        }
        if (inv.invoice_date >= firstDayOfMonth && isBill) {
          monthlySales += amount;
        }
        if (isBill) {
          totalGstCollected += (cgst + sgst + igst);
        }
      });
      
      return {
        todaySales,
        todayInvoices,
        monthlySales,
        totalCustomers: customers.length,
        totalProducts: products.length,
        totalGstCollected,
        recentInvoices: combined.sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)).slice(0, 5)
      };
    }
  },

  // Reports API
  getReportData: async (startDate?: string, endDate?: string): Promise<ReportData> => {
    try {
      let url = '/reports?';
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}&`;
      return await request<ReportData>(url);
    } catch {
      const drafts = getLocalDrafts();
      const localSaved = JSON.parse(localStorage.getItem('invoiceflow_saved_invoices') || '[]');
      let combined = [...drafts, ...localSaved];
      
      if (startDate) combined = combined.filter(i => i.invoice_date >= startDate);
      if (endDate) combined = combined.filter(i => i.invoice_date <= endDate);
      
      let totalSales = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      const dailySalesMap: Record<string, number> = {};
      
      combined.forEach(inv => {
        const amt = Number(inv.grand_total) || 0;
        const cgst = Number(inv.cgst_total) || 0;
        const sgst = Number(inv.sgst_total) || 0;
        const igst = Number(inv.igst_total) || 0;
        
        totalSales += amt;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;
        
        const date = inv.invoice_date;
        dailySalesMap[date] = (dailySalesMap[date] || 0) + amt;
      });
      
      const dailySales = Object.entries(dailySalesMap).map(([date, amount]) => ({
        date,
        amount
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      return {
        totalSales,
        totalTax: totalCgst + totalSgst + totalIgst,
        totalCgst,
        totalSgst,
        totalIgst,
        invoices: combined,
        dailySales
      };
    }
  }
};
