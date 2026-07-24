import QRCode from 'qrcode';
import { numberToWords, calculateInvoiceTotals } from '../utils/gstEngine';
import { Customer, Product, Invoice, BusinessProfile } from '../types';

interface PrefetchedInvoiceCalc {
  subtotal: number;
  cgst_total: number;
  sgst_total: number;
  igst_total: number;
  total_tax: number;
  grand_total: number;
  amount_in_words: string;
  qr_code_url: string;
}

class PrefetchCacheService {
  private pageDataCache: Map<string, any> = new Map();
  private customerHistoryCache: Map<string, Invoice[]> = new Map();
  private invoiceDetailsCache: Map<string, Invoice> = new Map();
  private stagedLogoAsset: { file: File; dataUrl: string; timestamp: number } | null = null;
  private precomputedInvoiceCalc: Map<string, PrefetchedInvoiceCalc> = new Map();
  private stagedDraftInvoice: Partial<Invoice> | null = null;
  private sharePayloadCache: Map<string, { whatsappText: string; mailtoUrl: string; qrUrl: string }> = new Map();

  // --- Page & Entity Data Prefetching ---
  public prefetchPageData(pageName: string, contextData?: { customers?: Customer[]; products?: Product[]; invoices?: Invoice[] }) {
    if (this.pageDataCache.has(pageName)) return;

    if (contextData) {
      const { customers = [], products = [], invoices = [] } = contextData;
      
      if (pageName === 'dashboard' || pageName === 'reports') {
        const totalTurnover = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
        const totalTax = invoices.reduce((sum, inv) => sum + (Number(inv.cgst_total || 0) + Number(inv.sgst_total || 0) + Number(inv.igst_total || 0)), 0);
        const activeCustomersCount = customers.length;
        const lowStockProductsCount = products.filter(p => (p.stock || 0) < 5).length;

        this.pageDataCache.set(pageName, {
          totalTurnover,
          totalTax,
          activeCustomersCount,
          lowStockProductsCount,
          prefetchedAt: Date.now()
        });
      } else if (pageName === 'gst-invoice' || pageName === 'nongst-invoice') {
        const type = pageName === 'gst-invoice' ? 'GST' : 'Non-GST';
        const typeInvoices = invoices.filter(i => i.invoice_type === type);
        const nextSequence = typeInvoices.length + 1;
        const defaultInvoiceNum = `${type === 'GST' ? 'INV' : 'BILL'}-${String(nextSequence).padStart(3, '0')}`;

        this.pageDataCache.set(pageName, {
          nextInvoiceNumber: defaultInvoiceNum,
          popularProducts: products.slice(0, 5),
          recentCustomers: customers.slice(0, 5),
          prefetchedAt: Date.now()
        });
      }
    }
  }

  public prefetchCustomerHistory(customerId: string, invoices: Invoice[]) {
    if (this.customerHistoryCache.has(customerId)) return;
    const history = invoices.filter(inv => inv.customer_id === customerId || inv.customer_snapshot?.id === customerId);
    this.customerHistoryCache.set(customerId, history);
  }

  public getPrefetchedCustomerHistory(customerId: string): Invoice[] | undefined {
    return this.customerHistoryCache.get(customerId);
  }

  public prefetchInvoiceDetails(invoice: Invoice) {
    if (!invoice.id) return;
    this.invoiceDetailsCache.set(invoice.id, invoice);
    
    // Also prefetch Share payload
    this.precomputeSharePayload(invoice);
  }

  // --- Early File Execution & Logo Staging ---
  public async stageLogoAsset(file: File): Promise<{ dataUrl: string; sizeKb: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.stagedLogoAsset = {
          file,
          dataUrl,
          timestamp: Date.now()
        };
        const sizeKb = Math.round(file.size / 1024);
        resolve({ dataUrl, sizeKb });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  public getStagedLogoAsset() {
    return this.stagedLogoAsset;
  }

  public clearStagedLogoAsset() {
    this.stagedLogoAsset = null;
  }

  // --- Real-time Early Calculation & Staging ---
  public async precomputeInvoiceCalc(
    items: any[],
    seller: BusinessProfile,
    placeOfSupply: string,
    upiId?: string
  ): Promise<PrefetchedInvoiceCalc> {
    const key = `${items.length}_${placeOfSupply}_${upiId}_${JSON.stringify(items.map(i => [i.product_id, i.quantity, i.rate, i.discount_pct, i.gst_rate]))}`;
    
    if (this.precomputedInvoiceCalc.has(key)) {
      return this.precomputedInvoiceCalc.get(key)!;
    }

    const totals = calculateInvoiceTotals(items, seller, placeOfSupply);
    const words = numberToWords(totals.grand_total);
    let qrUrl = '';

    if (upiId && totals.grand_total > 0) {
      try {
        const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(seller.business_name || '')}&am=${totals.grand_total.toFixed(2)}&cu=INR`.trim();
        qrUrl = await QRCode.toDataURL(upiString, { width: 120, margin: 1 });
      } catch (err) {
        console.warn('QR pre-generation warning:', err);
      }
    }

    const totalTax = (totals.cgst_total || 0) + (totals.sgst_total || 0) + (totals.igst_total || 0);

    const calcResult: PrefetchedInvoiceCalc = {
      subtotal: totals.subtotal,
      cgst_total: totals.cgst_total,
      sgst_total: totals.sgst_total,
      igst_total: totals.igst_total,
      total_tax: totalTax,
      grand_total: totals.grand_total,
      amount_in_words: words,
      qr_code_url: qrUrl
    };

    this.precomputedInvoiceCalc.set(key, calcResult);
    return calcResult;
  }

  public stageDraftInvoice(draft: Partial<Invoice>) {
    this.stagedDraftInvoice = {
      ...draft,
      updatedAt: new Date().toISOString()
    } as any;
  }

  public getStagedDraftInvoice() {
    return this.stagedDraftInvoice;
  }

  // --- Share Payload Early Execution ---
  public async precomputeSharePayload(invoice: Invoice, sellerProfile?: BusinessProfile | null) {
    if (!invoice.id) return;

    const invoiceNum = invoice.invoice_number;
    const customerName = invoice.customer_snapshot?.name || 'Customer';
    const amount = Number(invoice.grand_total).toFixed(2);
    const upiId = sellerProfile?.upi_id;

    const whatsappText = `Hello ${customerName}, here is your ${invoice.invoice_type === 'GST' ? 'GST Invoice' : 'Bill'} ${invoiceNum} for ₹${amount}. Thank you for doing business with us!`;
    const mailtoUrl = `mailto:${invoice.customer_snapshot?.email || ''}?subject=${encodeURIComponent(`Invoice ${invoiceNum} from ${sellerProfile?.business_name || 'Us'}`)}&body=${encodeURIComponent(whatsappText)}`;
    
    let qrUrl = '';
    if (upiId && Number(amount) > 0) {
      try {
        const upiString = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(sellerProfile?.business_name || '')}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Invoice ${invoiceNum}`)}`.trim();
        qrUrl = await QRCode.toDataURL(upiString, { width: 120, margin: 1 });
      } catch (err) {
        console.warn('Share QR pre-generation error:', err);
      }
    }

    const payload = { whatsappText, mailtoUrl, qrUrl };
    this.sharePayloadCache.set(invoice.id, payload);
    return payload;
  }

  public getPrefetchedSharePayload(invoiceId: string) {
    return this.sharePayloadCache.get(invoiceId);
  }
}

export const prefetchCache = new PrefetchCacheService();
