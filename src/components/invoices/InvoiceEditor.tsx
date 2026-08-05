import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { prefetchCache } from '../../services/prefetchCache';
import { Invoice, InvoiceItem, Customer, PaymentMode, PaymentStatus, BusinessProfile } from '../../types';
import { calculateInvoiceTotals, numberToWords, INDIAN_STATES } from '../../utils/gstEngine';
import { Dialog } from '../ui/Dialog';
import { ShareDialog } from './ShareDialog';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Eye, 
  Save, 
  Printer, 
  UserPlus, 
  Building,
  ArrowLeft,
  Info,
  Share2,
  Barcode,
  Keyboard
} from 'lucide-react';

interface InvoiceEditorProps {
  type: 'GST' | 'Non-GST';
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ type }) => {
  const { 
    gstProfile,
    nongstProfile,
    customers, 
    products, 
    invoices, 
    addInvoice, 
    updateInvoice,
    selectedInvoiceIdForEdit,
    setSelectedInvoiceIdForEdit,
    setActivePage,
    addCustomer,
    showToast 
  } = useApp();

  const profile = type === 'GST' ? gstProfile : nongstProfile;

  // If editing, find the invoice
  const editInvoice = selectedInvoiceIdForEdit 
    ? invoices.find(i => i.id === selectedInvoiceIdForEdit) 
    : null;

  // Invoice Form State
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [placeOfSupply, setPlaceOfSupply] = useState('Maharashtra');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  
  // Invoice Items State
  const [items, setItems] = useState<InvoiceItem[]>([
    { product_name: '', description: '', hsn_code: '', quantity: 1, unit: 'PCS', rate: 0, discount_pct: 0, gst_rate: 18, cgst_rate: 9, sgst_rate: 9, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, amount: 0 }
  ]);
  
  const [notes, setNotes] = useState('Thank you for your business!');
  const [terms, setTerms] = useState('1. Please pay within due date.\n2. Goods once sold will not be taken back.');

  // UPI QR Code state (generated client-side)
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');

  // UI state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'edit' | 'preview'>('edit');
  const [newCustName, setNewCustName] = useState('');
  const [newCustMobile, setNewCustMobile] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Auto-generate invoice number
  useEffect(() => {
    if (editInvoice) {
      // Load edit values
      setInvoiceNumber(editInvoice.invoice_number);
      setInvoiceDate(editInvoice.invoice_date);
      setDueDate(editInvoice.due_date || '');
      setPaymentMode(editInvoice.payment_mode);
      setPaymentStatus(editInvoice.payment_status);
      setPlaceOfSupply(editInvoice.place_of_supply);
      setReverseCharge(editInvoice.reverse_charge);
      setSelectedCustomerId(editInvoice.customer_id || '');
      setCustomerDetails(editInvoice.customer_snapshot);
      setItems(editInvoice.items || []);
      setNotes(editInvoice.notes || '');
      setTerms(editInvoice.terms_conditions || '');
    } else {
      // Auto-increment logic
      api.getNextInvoiceNumber().then(nextNum => {
        setInvoiceNumber(nextNum);
      }).catch(() => {
        const prefix = type === 'GST' ? 'GST-' : 'BILL-';
        const year = new Date().getFullYear();
        setInvoiceNumber(`${prefix}${year}-0001`);
      });
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setPaymentMode('UPI');
      setPaymentStatus('Unpaid');
      setSelectedCustomerId('');
      setCustomerDetails(null);
      setItems([
        { product_name: '', description: '', hsn_code: '', quantity: 1, unit: 'PCS', rate: 0, discount_pct: 0, gst_rate: type === 'GST' ? 18 : 0, cgst_rate: type === 'GST' ? 9 : 0, sgst_rate: type === 'GST' ? 9 : 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, amount: 0 }
      ]);
    }
  }, [editInvoice, type]);

  // POS Barcode & Fast Scan
  const [barcodeInput, setBarcodeInput] = useState('');

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeInput.trim()) {
      e.preventDefault();
      const code = barcodeInput.trim().toLowerCase();
      const matched = products.find(p => 
        (p.barcode && p.barcode.toLowerCase() === code) ||
        (p.sku && p.sku.toLowerCase() === code) ||
        p.name.toLowerCase().includes(code)
      );

      if (matched) {
        const existingIdx = items.findIndex(i => i.product_id === matched.id || i.product_name === matched.name);
        if (existingIdx > -1) {
          setItems(prev => {
            const updated = [...prev];
            updated[existingIdx] = {
              ...updated[existingIdx],
              quantity: updated[existingIdx].quantity + 1
            };
            return updated;
          });
        } else {
          const newItem: InvoiceItem = {
            product_id: matched.id,
            product_name: matched.name,
            description: matched.description || '',
            hsn_code: matched.hsn_code || '',
            quantity: 1,
            unit: matched.unit || 'PCS',
            rate: Number(matched.selling_price) || 0,
            discount_pct: 0,
            gst_rate: type === 'GST' ? (Number(matched.gst_rate) || 18) : 0,
            cgst_rate: type === 'GST' ? (matched.gst_rate ? Number(matched.gst_rate) / 2 : 9) : 0,
            sgst_rate: type === 'GST' ? (matched.gst_rate ? Number(matched.gst_rate) / 2 : 9) : 0,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: 0,
            amount: 0
          };
          if (items.length === 1 && !items[0].product_name) {
            setItems([newItem]);
          } else {
            setItems(prev => [...prev, newItem]);
          }
        }
        showToast(`Added ${matched.name} to bill`, 'success');
        setBarcodeInput('');
      } else {
        showToast(`No product found for '${barcodeInput}'`, 'warning');
      }
    }
  };

  // Early Execution: Auto-calculate totals, pre-generate UPI QR code, and stage draft in real-time background
  useEffect(() => {
    const sellerProfile = profile || ({
      business_name: 'Company',
      address: 'Address',
      city: 'City',
      state: 'Maharashtra',
      state_code: '27',
      phone: ''
    } as BusinessProfile);

    // Background pre-calculation
    prefetchCache.precomputeInvoiceCalc(items, sellerProfile, placeOfSupply, profile?.upi_id).then(calc => {
      if (calc.qr_code_url) {
        setUpiQrDataUrl(calc.qr_code_url);
      }
    });

    // Generate UPI QR data URL fallback if upi_id is set
    if (profile?.upi_id) {
      const grandTotal = calculateInvoiceTotals(items, sellerProfile!, placeOfSupply).grand_total;
      const upiString = `upi://pay?pa=${encodeURIComponent(profile.upi_id)}&pn=${encodeURIComponent(profile.business_name || '')}&am=${grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNumber}`)}`.trim();
      QRCode.toDataURL(upiString, {
        width: 120,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
        .then(url => setUpiQrDataUrl(url))
        .catch(() => {});
    } else {
      setUpiQrDataUrl('');
    }

    // Auto-stage temporary background draft so clicking save/generate only commits pre-staged payload
    const currentTotals = calculateInvoiceTotals(items, sellerProfile!, placeOfSupply);
    prefetchCache.stageDraftInvoice({
      invoice_number: invoiceNumber,
      invoice_type: type,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      payment_mode: paymentMode,
      payment_status: paymentStatus,
      place_of_supply: placeOfSupply,
      reverse_charge: reverseCharge,
      customer_id: selectedCustomerId,
      customer_snapshot: customerDetails || undefined,
      seller_snapshot: profile || undefined,
      subtotal: currentTotals.subtotal,
      cgst_total: currentTotals.cgst_total,
      sgst_total: currentTotals.sgst_total,
      igst_total: currentTotals.igst_total,
      round_off: currentTotals.round_off,
      grand_total: currentTotals.grand_total,
      notes,
      terms_conditions: terms,
      items: currentTotals.items
    });
  }, [profile, items, type, invoiceNumber, placeOfSupply, invoiceDate, dueDate, paymentMode, paymentStatus, reverseCharge, selectedCustomerId, customerDetails, notes, terms]);

  // Handle customer selection change
  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setCustomerDetails(cust);
      setPlaceOfSupply(cust.state);
    } else {
      setCustomerDetails(null);
    }
  };

  // Create Customer Inline Shortcut
  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustMobile || !newCustAddress) {
      showToast('Name, mobile and address are required.', 'danger');
      return;
    }
    
    try {
      const cust = await addCustomer({
        name: newCustName,
        mobile: newCustMobile,
        address: newCustAddress,
        city: 'Mumbai',
        state: 'Maharashtra',
        state_code: '27',
        country: 'India'
      });
      setSelectedCustomerId(cust.id);
      setCustomerDetails(cust);
      setPlaceOfSupply(cust.state);
      setIsCustomerModalOpen(false);
      setNewCustName('');
      setNewCustMobile('');
      setNewCustAddress('');
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  // Product Selection auto-fill
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    updateItemField(index, {
      product_id: prod.id,
      product_name: prod.name,
      description: prod.description || '',
      hsn_code: prod.hsn_code || '',
      unit: prod.unit,
      rate: Number(prod.selling_price) || 0,
      gst_rate: type === 'GST' ? (Number(prod.gst_rate) || 0) : 0,
      cgst_rate: type === 'GST' ? (Number(prod.cgst_rate) || 0) : 0,
      sgst_rate: type === 'GST' ? (Number(prod.sgst_rate) || 0) : 0
    });
  };

  // Update item field
  const updateItemField = (index: number, fields: Partial<InvoiceItem>) => {
    setItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        ...fields
      };
      return updated;
    });
  };

  // Table items modifiers
  const addItemRow = () => {
    setItems(prev => [...prev, {
      product_name: '', description: '', hsn_code: '', quantity: 1, unit: 'PCS', rate: 0, discount_pct: 0, gst_rate: type === 'GST' ? 18 : 0, cgst_rate: type === 'GST' ? 9 : 0, sgst_rate: type === 'GST' ? 9 : 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, amount: 0
    }]);
  };

  const deleteItemRow = (index: number) => {
    if (items.length === 1) {
      showToast('Invoice must contain at least one item.', 'warning');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const duplicateItemRow = (index: number) => {
    setItems(prev => {
      const duplicated = { ...prev[index] };
      return [...prev, duplicated];
    });
  };

  // Calculate calculations
  const sellerObj = profile || {
    business_name: 'Your Company Name',
    address: 'Configure Business Address in Settings',
    city: 'Mumbai',
    state: 'Maharashtra',
    state_code: '27',
    phone: '9999999999'
  };

  const totals = calculateInvoiceTotals(items, sellerObj, placeOfSupply);
  const totalDiscount = totals.items.reduce((s: number, i: any) => s + i.rate * i.quantity * i.discount_pct / 100, 0);

  // Submit / Save handler
  const handleSaveInvoice = async (isDraft: boolean) => {
    if (!profile) {
      showToast('Please configure your Business Profile in Settings first.', 'danger');
      return;
    }
    if (!customerDetails) {
      showToast('Please select or create a customer.', 'danger');
      return;
    }
    if (items.some(item => !item.product_name || item.rate <= 0 || item.quantity <= 0)) {
      showToast('Please fill all item names, rates, and quantities.', 'danger');
      return;
    }

    const invoicePayload: Omit<Invoice, 'id'> & { isDraft?: boolean } = {
      invoice_number: invoiceNumber,
      invoice_type: type,
      invoice_date: invoiceDate,
      due_date: dueDate || undefined,
      payment_mode: paymentMode,
      payment_status: isDraft ? 'Unpaid' : paymentStatus,
      place_of_supply: placeOfSupply,
      reverse_charge: reverseCharge,
      customer_id: selectedCustomerId,
      customer_snapshot: customerDetails,
      seller_snapshot: profile,
      subtotal: totals.subtotal,
      cgst_total: totals.cgst_total,
      sgst_total: totals.sgst_total,
      igst_total: totals.igst_total,
      round_off: totals.round_off,
      grand_total: totals.grand_total,
      notes,
      terms_conditions: terms,
      items: totals.items,
      isDraft
    };

    try {
      if (editInvoice && editInvoice.id) {
        await updateInvoice(editInvoice.id, invoicePayload);
      } else {
        await addInvoice(invoicePayload);
      }
      setSelectedInvoiceIdForEdit(null);
      setActivePage('invoice-history');
    } catch (err: any) {
      showToast(err.message, 'danger');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getInvoiceData = (): Invoice => ({
    id: editInvoice?.id || `inv_${Date.now()}`,
    invoice_number: invoiceNumber,
    invoice_type: type,
    invoice_date: invoiceDate,
    due_date: dueDate || undefined,
    payment_mode: paymentMode,
    payment_status: paymentStatus,
    place_of_supply: placeOfSupply,
    reverse_charge: reverseCharge,
    customer_id: customerDetails?.id || '',
    customer_snapshot: customerDetails || { id: '', name: '', address: '', city: '', state: '', state_code: '', mobile: '' },
    seller_snapshot: sellerObj,
    subtotal: totals.subtotal,
    cgst_total: totals.cgst_total,
    sgst_total: totals.sgst_total,
    igst_total: totals.igst_total,
    round_off: totals.round_off,
    grand_total: totals.grand_total,
    notes,
    terms_conditions: terms,
    items: totals.items,
  });

  const isIGST = type === 'GST' && totals.igst_total > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Settings warning */}
      {!profile && (
        <div className="flex gap-3.5 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-semibold no-print">
          <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div>
            <span>Business Profile is not set up. Please click </span>
            <button onClick={() => setActivePage('settings')} className="text-primary underline font-bold">here to set up Business Profile</button>
            <span> before creating invoices so that your billing details appear correctly.</span>
          </div>
        </div>
      )}

      {/* Editor Layout: Form and Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Editor Panel */}
        <div className={`xl:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-6 no-print ${previewTab === 'preview' ? 'hidden xl:block' : 'block'}`}>
          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-slate-50 dark:border-slate-850">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setSelectedInvoiceIdForEdit(null);
                  setActivePage('dashboard');
                }}
                className="p-1 text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">
                {editInvoice ? 'Edit' : 'Create'} {type} Invoice
              </h2>
            </div>
            
            {/* View switcher for smaller devices */}
            <button
              onClick={() => setPreviewTab('preview')}
              className="xl:hidden h-9 px-3 rounded-lg bg-slate-50 text-text-primary hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
            >
              <Eye className="h-4 w-4" />
              <span>Preview Layout</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Invoice Metadata */}
            <div>
              <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250 font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
              >
                <option value="Unpaid">Unpaid / Uncollected</option>
                <option value="Paid">Paid / Collected</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Customer Selection */}
          <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-850">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Customer Details</label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
              >
                <UserPlus className="h-4.5 w-4.5" />
                <span>Quick Add</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-4">
                <select
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
                  disabled={!selectedCustomerId}
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {customerDetails && (
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl text-xs space-y-1 font-semibold text-text-secondary dark:text-slate-400">
                <p className="text-text-primary dark:text-slate-200 font-bold">{customerDetails.name}</p>
                {customerDetails.company_name && <p className="flex items-center gap-1"><Building className="h-3.5 w-3.5 text-text-light" /> {customerDetails.company_name}</p>}
                <p>{customerDetails.address}, {customerDetails.city}, {customerDetails.state}</p>
                <p>Mobile: {customerDetails.mobile}</p>
                {customerDetails.gstin && <p className="text-blue-600 dark:text-blue-400">GSTIN: {customerDetails.gstin}</p>}
              </div>
            )}
          </div>

          {/* POS Barcode & Fast Scan Bar */}
          <div className="p-3.5 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 shrink-0">
              <Barcode className="h-4 w-4" /> POS Fast Scan:
            </div>
            <input
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              placeholder="Scan barcode, SKU, or type product name & press Enter..."
              className="flex-1 h-9 px-3 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
            />
            <div className="flex items-center gap-2 text-[10px] font-medium text-text-secondary dark:text-slate-400 shrink-0">
              <Keyboard className="h-3.5 w-3.5 text-text-light" />
              <span><kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">F2</kbd> Add row | <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">Ctrl+Enter</kbd> Save</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider">Invoice Items</h3>
            
            <div className="space-y-3.5">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-850 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end relative"
                >
                  {/* Select Product */}
                  <div className="sm:col-span-5">
                    <label className="block text-[9px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider mb-1">Select Product / Item Name *</label>
                    <select
                      onChange={(e) => handleProductSelect(index, e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250 mb-1.5"
                    >
                      <option value="">-- Choose Product catalog --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (₹{p.selling_price})</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Item Custom Name"
                      value={item.product_name}
                      onChange={(e) => updateItemField(index, { product_name: e.target.value })}
                      className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250 font-bold"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider mb-1">Qty</label>
                    <input
                      type="number"
                      required
                      min={0.001}
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItemField(index, { quantity: Number(e.target.value) || 0 })}
                      className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="sm:col-span-3">
                    <label className="block text-[9px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider mb-1">Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateItemField(index, { rate: Number(e.target.value) || 0 })}
                      className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250 font-bold"
                    />
                  </div>

                  {/* GST Column (GST Editor only) */}
                  {type === 'GST' ? (
                    <div className="sm:col-span-2">
                      <label className="block text-[9px] font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider mb-1">GST %</label>
                      <select
                        value={item.gst_rate}
                        onChange={(e) => updateItemField(index, { gst_rate: Number(e.target.value) || 0 })}
                        className="w-full h-10 px-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-text-primary dark:text-slate-250"
                      >
                        <option value={0}>0%</option>
                        <option value={3}>3%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  ) : null}

                  {/* Extra Options Panel (HSN, Discount) */}
                  <div className="sm:col-span-12 grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      placeholder="HSN (Optional)"
                      value={item.hsn_code}
                      onChange={(e) => updateItemField(index, { hsn_code: e.target.value })}
                      className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-lg text-text-secondary dark:text-slate-300"
                    />
                    <input
                      type="number"
                      placeholder="Discount %"
                      min={0}
                      max={100}
                      value={item.discount_pct || ''}
                      onChange={(e) => updateItemField(index, { discount_pct: Number(e.target.value) || 0 })}
                      className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-lg text-text-secondary dark:text-slate-300"
                    />
                    <input
                      type="text"
                      placeholder="Unit (e.g. PCS)"
                      value={item.unit}
                      onChange={(e) => updateItemField(index, { unit: e.target.value })}
                      className="h-9 px-3 text-xs border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 rounded-lg text-text-secondary dark:text-slate-300"
                    />
                  </div>

                  {/* Row Actions */}
                  <div className="absolute right-4 top-4 sm:relative sm:right-auto sm:top-auto sm:col-span-12 flex justify-end gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => duplicateItemRow(index)}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-text-secondary dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                      title="Duplicate Row"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItemRow(index)}
                      className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-500 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 transition-colors"
                      title="Delete Row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={addItemRow}
              className="h-10 px-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary/50 text-text-secondary hover:text-primary dark:border-slate-750 dark:hover:border-slate-650 flex items-center justify-center gap-1.5 w-full text-xs font-bold transition-all duration-200"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Add Item Line</span>
            </button>
          </div>

          {/* Terms & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Remarks / Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 text-text-primary dark:text-slate-250"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-secondary dark:text-slate-400 uppercase tracking-wider mb-1">Terms & Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 text-text-primary dark:text-slate-250"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex flex-wrap gap-3 justify-end pt-4 border-t border-slate-50 dark:border-slate-850">
            <button
              type="button"
              onClick={() => handleSaveInvoice(true)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-850 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save Draft</span>
            </button>
            <button
              type="button"
              onClick={() => handleSaveInvoice(false)}
              className="h-10 px-5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs shadow-soft hover:shadow-premium transition-all duration-200 flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
              <span>Save & Register</span>
            </button>
          </div>
        </div>

        {/* Live A4 Print Preview Panel */}
        <div className={`xl:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-6 overflow-x-auto w-full ${previewTab === 'edit' ? 'hidden xl:block' : 'block'}`}>
          <div className="flex justify-between items-center pb-4 border-b border-slate-50 dark:border-slate-850 no-print">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">A4 Live Print View</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setShareOpen(true)}
                className="h-9 px-3 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-1.5 shadow-soft"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button
                onClick={handlePrint}
                className="h-9 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-text-primary dark:bg-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setPreviewTab('edit')}
                className="xl:hidden h-9 px-3 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Eye className="h-4 w-4" />
                <span>Edit fields</span>
              </button>
            </div>
          </div>

          {/* Printable Invoice Page Container — Modern Professional Layout */}
          <div ref={printRef} className="bg-white text-slate-800 p-0 border border-slate-200 rounded-xl max-w-2xl mx-auto shadow-sm text-xs font-sans print-container select-text overflow-hidden">
            {/* ────────────── HEADER BAR ────────────── */}
            <div className="bg-slate-800 text-white px-6 py-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {profile?.logo_url ? (
                    <img src={profile.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded bg-white p-1" />
                  ) : null}
                  <div>
                    <div className="font-bold text-sm tracking-wide">{sellerObj.business_name}</div>
                    <div className="text-[8px] text-slate-300 leading-relaxed mt-0.5">
                      {sellerObj.address}, {sellerObj.city}, {sellerObj.state}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {type === 'GST' && <div className="text-[7px] uppercase tracking-widest text-amber-300 font-semibold">Original</div>}
                </div>
              </div>
            </div>

            {/* ────────────── INVOICE META ────────────── */}
            <div className="flex justify-between items-center px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[9px] text-slate-600">
              <div className="flex gap-6">
                <span><span className="font-medium text-slate-700">{type === 'GST' ? 'Invoice' : 'Bill'} No:</span> {invoiceNumber}</span>
                <span><span className="font-medium text-slate-700">Date:</span> {new Date(invoiceDate).toLocaleDateString('en-IN')}</span>
                {dueDate && <span><span className="font-medium text-slate-700">Due:</span> {new Date(dueDate).toLocaleDateString('en-IN')}</span>}
              </div>
              <div>
                {type === 'GST' && <span><span className="font-medium text-slate-700">Place of Supply:</span> {placeOfSupply}</span>}
              </div>
            </div>

            {/* ────────────── BILL FROM / BILL TO ────────────── */}
            <div className="grid grid-cols-2 gap-0 px-6 py-3 border-b border-slate-200">
              <div className="pr-4">
                <div className="text-[8px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Bill From</div>
                <div className="text-[9px] leading-relaxed text-slate-700">
                  <div className="font-medium text-slate-800">{sellerObj.business_name}</div>
                  {profile?.gstin && <div className="text-slate-500">GSTIN: {profile.gstin}</div>}
                  <div className="text-slate-500">{sellerObj.address}, {sellerObj.city}, {sellerObj.state}</div>
                  <div className="text-slate-500">Phone: {sellerObj.phone}</div>
                </div>
              </div>
              <div className="pl-4 border-l border-slate-200">
                <div className="text-[8px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Bill To</div>
                <div className="text-[9px] leading-relaxed text-slate-700">
                  <div className="font-medium text-slate-800">{customerDetails?.name || 'Customer Name'}</div>
                  {customerDetails?.gstin && <div className="text-slate-500">GSTIN: {customerDetails.gstin}</div>}
                  <div className="text-slate-500">{customerDetails?.address || ''}, {customerDetails?.city || ''}, {customerDetails?.state || ''}</div>
                  <div className="text-slate-500">Phone: {customerDetails?.mobile || ''}</div>
                  {customerDetails?.email && <div className="text-slate-500">Email: {customerDetails.email}</div>}
                </div>
              </div>
            </div>

            {/* ────────────── ITEMS TABLE ────────────── */}
            <div className="px-6 py-3">
              <table className="w-full text-left border-collapse text-[9px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-medium uppercase text-[8px] tracking-wider">
                    <th className="p-1.5 text-center w-6">#</th>
                    <th className="p-1.5">Item</th>
                    {type === 'GST' && <th className="p-1.5 text-center w-12">HSN</th>}
                    <th className="p-1.5 text-right w-10">Qty</th>
                    <th className="p-1.5 text-right w-14">Price</th>
                    {type === 'GST' && <th className="p-1.5 text-right w-12">GST %</th>}
                    <th className="p-1.5 text-right w-16">Amount</th>
                  </tr>
                </thead>
                <tbody className="font-normal">
                  {totals.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/50">
                      <td className="p-1.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-1.5 font-normal text-slate-800">
                        {item.product_name}
                        {item.description && <div className="text-[7px] text-slate-400 font-normal">{item.description}</div>}
                      </td>
                      {type === 'GST' && <td className="p-1.5 text-center text-slate-500">{item.hsn_code || '-'}</td>}
                      <td className="p-1.5 text-right text-slate-700">{item.quantity}</td>
                      <td className="p-1.5 text-right text-slate-700">₹{item.rate.toFixed(2)}</td>
                      {type === 'GST' && <td className="p-1.5 text-right text-slate-600">{item.gst_rate}%</td>}
                      <td className="p-1.5 text-right font-normal text-slate-800">₹{(item.rate * (1 - item.discount_pct / 100) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ────────────── TOTALS PANEL ────────────── */}
            <div className="flex justify-end px-6 pb-3">
              <div className="w-56 bg-slate-50 rounded-lg border border-slate-200 p-3">
                <div className="space-y-1.5 text-[9px] font-normal">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{type === 'GST' ? 'Taxable Amount' : 'Subtotal'}</span>
                    <span className="font-normal text-slate-800">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {type === 'GST' && !isIGST && totals.cgst_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">CGST (9%)</span>
                      <span className="text-slate-700">₹{totals.cgst_total.toFixed(2)}</span>
                    </div>
                  )}
                  {type === 'GST' && !isIGST && totals.sgst_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">SGST (9%)</span>
                      <span className="text-slate-700">₹{totals.sgst_total.toFixed(2)}</span>
                    </div>
                  )}
                  {type === 'GST' && isIGST && totals.igst_total > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">IGST</span>
                      <span className="text-slate-700">₹{totals.igst_total.toFixed(2)}</span>
                    </div>
                  )}
                  {totalDiscount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="text-slate-600">-₹{totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  {type !== 'GST' && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Delivery</span>
                      <span className="text-slate-700">₹0.00</span>
                    </div>
                  )}
                  {totals.round_off !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Round Off</span>
                      <span className="text-slate-700">{totals.round_off.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-1.5 mt-1.5 flex justify-between font-bold text-slate-800">
                    <span className="uppercase text-[10px]">{type === 'GST' ? 'Grand Total' : 'TOTAL'}</span>
                    <span className="text-sm">₹{totals.grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ────────────── AMOUNT IN WORDS ────────────── */}
            <div className="px-6 py-2 border-t border-slate-200 bg-slate-50/50">
              <span className="text-[8px] font-bold uppercase tracking-wide text-slate-500">Amount in Words: </span>
              <span className="text-[9px] font-medium text-slate-700 italic">{numberToWords(totals.grand_total)}</span>
            </div>

            {/* ────────────── BANK DETAILS + QR ────────────── */}
            <div className="grid grid-cols-2 gap-0 px-6 py-3 border-t border-slate-200">
              <div className="text-[8px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700 uppercase text-[8px] tracking-wide mb-1">Bank Details</div>
                <div>Bank: <span className="font-medium text-slate-700">{profile?.bank_name || '-'}</span></div>
                <div>A/C: <span className="font-medium text-slate-700">{profile?.account_number || '-'}</span></div>
                <div>IFSC: <span className="font-medium text-slate-700">{profile?.ifsc_code || '-'}</span></div>
                {profile?.upi_id && <div>UPI: <span className="font-medium text-slate-700">{profile.upi_id}</span></div>}
              </div>
              <div className="flex flex-col items-end justify-start">
                {upiQrDataUrl && (
                  <div className="flex flex-col items-center">
                    <div className="text-[7px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">Scan to Pay</div>
                    <img src={upiQrDataUrl} alt="UPI QR" className="w-14 h-14 border border-slate-300 rounded" />
                    <div className="text-[6px] text-slate-400 mt-0.5 max-w-[80px] break-all text-center">{profile?.upi_id}</div>
                  </div>
                )}
                {!upiQrDataUrl && profile?.upi_id && (
                  <div className="text-[8px] text-slate-400 italic self-end">UPI: {profile.upi_id}</div>
                )}
              </div>
            </div>

            {/* ────────────── TERMS & SIGNATURE ────────────── */}
            <div className="grid grid-cols-2 gap-0 px-6 py-3 border-t border-slate-200">
              <div className="pr-4">
                <div className="text-[8px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">Terms &amp; Conditions</div>
                <div className="text-[8px] text-slate-500 leading-relaxed whitespace-pre-line">{terms}</div>
              </div>
              <div className="flex flex-col items-end justify-end pl-4 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-[8px] text-slate-500">For <span className="font-semibold text-slate-700">{sellerObj.business_name}</span></div>
                  <div className="w-28 border-b border-dashed border-slate-300 mt-5 mb-0.5" />
                  <div className="text-[9px] font-semibold text-slate-700">Authorized Signature</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        invoice={getInvoiceData()}
        items={totals.items}
      />

      {/* Quick Add Customer Dialog */}
      <Dialog
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Quick Add Customer"
      >
        <form onSubmit={handleQuickCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={newCustName}
              onChange={(e) => setNewCustName(e.target.value)}
              className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Mobile *</label>
            <input
              type="tel"
              required
              value={newCustMobile}
              onChange={(e) => setNewCustMobile(e.target.value)}
              className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Billing Address *</label>
            <textarea
              required
              rows={2}
              value={newCustAddress}
              onChange={(e) => setNewCustAddress(e.target.value)}
              className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-text-secondary hover:bg-slate-50 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs shadow-soft"
            >
              Add Customer
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
