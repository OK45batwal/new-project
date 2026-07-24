import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice } from '../types';
import { calculateInvoiceTotals, numberToWords } from '../utils/gstEngine';
import { ShareDialog } from '../components/invoices/ShareDialog';
import { ArrowLeft, Share2, Printer, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

interface InvoiceViewProps {
  invoiceId: string;
  onBack?: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoiceId, onBack }) => {
  const { invoices, showToast, refreshData } = useApp();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>('');

  useEffect(() => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (inv) {
      setInvoice(inv);
      setLoading(false);
    } else {
      refreshData().then(() => {
        const found = invoices.find(i => i.id === invoiceId);
        if (found) setInvoice(found);
        else showToast('Invoice not found', 'danger');
        setLoading(false);
      });
    }
  }, [invoiceId, invoices, refreshData, showToast]);

  useEffect(() => {
    if (invoice?.seller_snapshot?.upi_id) {
      const upi = invoice.seller_snapshot.upi_id.replace(/[^a-zA-Z0-9@._-]/g, '');
      const upiString = `upi://pay?pa=${upi}&pn=${encodeURIComponent(invoice.seller_snapshot.business_name)}&am=${Number(invoice.grand_total).toFixed(2)}&cu=INR`;
      QRCode.toDataURL(upiString, { width: 140, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } })
        .then(setUpiQrDataUrl)
        .catch(() => {});
    } else {
      setUpiQrDataUrl('');
    }
  }, [invoice]);

  useEffect(() => {
    if (!loading && invoice && window.location.search.includes('print')) {
      setTimeout(() => { window.print(); }, 500);
    }
  }, [loading, invoice]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white gap-4 p-8">
        <h2 className="text-xl font-bold text-slate-800">Invoice Not Found</h2>
        <p className="text-sm text-slate-500">The invoice you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const isGst = invoice.invoice_type === 'GST';
  const items = invoice.items || [];
  const totals = calculateInvoiceTotals(items, invoice.seller_snapshot, invoice.place_of_supply);
  const s = invoice.customer_snapshot;
  const sel = invoice.seller_snapshot;
  const totalDiscount = items.reduce((sum: number, item: any) => sum + Number(item.rate) * Number(item.quantity) * Number(item.discount_pct) / 100, 0);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex justify-between items-center no-print">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-800">{invoice.invoice_number}</h1>
              <p className="text-xs text-slate-500">Shareable Invoice View</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShareOpen(true)} className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-soft hover:shadow-premium transition-all">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            <button onClick={() => window.print()} className="h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50 transition-colors">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Invoice — Modern Professional Layout */}
        <div className="bg-white text-slate-800 border border-slate-200 rounded-xl shadow-sm text-xs font-sans select-text overflow-hidden">
          {/* ─── HEADER BAR ─── */}
          <div className="bg-slate-800 text-white px-6 py-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {sel.logo_url ? (
                  <img src={sel.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded bg-white p-1" />
                ) : null}
                <div>
                  <div className="font-bold text-sm tracking-wide">{sel.business_name}</div>
                  <div className="text-[8px] text-slate-300 leading-relaxed mt-0.5">{sel.address}, {sel.city}, {sel.state}</div>
                </div>
              </div>
              <div className="text-right">
                {isGst && <div className="text-[7px] uppercase tracking-widest text-amber-300 font-semibold">Original</div>}
              </div>
            </div>
          </div>

          {/* ─── INVOICE META ─── */}
          <div className="flex justify-between items-center px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-[9px] text-slate-500">
            <div className="flex gap-6">
              <span><span className="font-medium text-slate-700">{isGst ? 'Invoice' : 'Bill'} No:</span> {invoice.invoice_number}</span>
              <span><span className="font-medium text-slate-700">Date:</span> {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}</span>
              {invoice.due_date && <span><span className="font-medium text-slate-700">Due:</span> {new Date(invoice.due_date).toLocaleDateString('en-IN')}</span>}
            </div>
            {isGst && <span><span className="font-medium text-slate-700">Place of Supply:</span> {invoice.place_of_supply}</span>}
          </div>

          {/* ─── BILL FROM / BILL TO ─── */}
          <div className="grid grid-cols-2 gap-0 px-6 py-3 border-b border-slate-200">
            <div className="pr-4">
              <div className="text-[8px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Bill From</div>
              <div className="text-[9px] leading-relaxed text-slate-700">
                <div className="font-medium text-slate-800">{sel.business_name}</div>
                {sel.gstin && <div className="text-slate-500">GSTIN: {sel.gstin}</div>}
                <div className="text-slate-500">{sel.address}, {sel.city}, {sel.state}</div>
                <div className="text-slate-500">Phone: {sel.phone}</div>
              </div>
            </div>
            <div className="pl-4 border-l border-slate-200">
              <div className="text-[8px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">Bill To</div>
              <div className="text-[9px] leading-relaxed text-slate-700">
                <div className="font-medium text-slate-800">{s.name}</div>
                {s.company_name && <div className="text-slate-500">{s.company_name}</div>}
                {s.gstin && <div className="text-slate-500">GSTIN: {s.gstin}</div>}
                <div className="text-slate-500">{s.address}, {s.city}, {s.state}</div>
                <div className="text-slate-500">Phone: {s.mobile}</div>
                {s.email && <div className="text-slate-500">Email: {s.email}</div>}
              </div>
            </div>
          </div>

          {/* ─── ITEMS TABLE ─── */}
          <div className="px-6 py-3">
            <table className="w-full text-left border-collapse text-[9px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500 font-medium uppercase text-[8px] tracking-wider">
                  <th className="p-1.5 text-center w-6">#</th>
                  <th className="p-1.5">Item</th>
                  {isGst && <th className="p-1.5 text-center w-12">HSN</th>}
                  <th className="p-1.5 text-right w-10">Qty</th>
                  <th className="p-1.5 text-right w-14">Price</th>
                  {isGst && <th className="p-1.5 text-right w-12">GST %</th>}
                  <th className="p-1.5 text-right w-16">Amount</th>
                </tr>
              </thead>
              <tbody className="font-normal">
                {items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-200 last:border-b-0">
                    <td className="p-1.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-1.5 font-normal text-slate-800">
                      {item.product_name}
                      {item.description && <div className="text-[7px] text-slate-400 font-normal">{item.description}</div>}
                    </td>
                    {isGst && <td className="p-1.5 text-center text-slate-500">{item.hsn_code || '-'}</td>}
                    <td className="p-1.5 text-right text-slate-700">{item.quantity}</td>
                    <td className="p-1.5 text-right text-slate-700">₹{Number(item.rate).toFixed(2)}</td>
                    {isGst && <td className="p-1.5 text-right text-slate-600">{item.gst_rate}%</td>}
                    <td className="p-1.5 text-right font-normal text-slate-800">
                      ₹{(Number(item.rate) * (1 - Number(item.discount_pct) / 100) * Number(item.quantity)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── TOTALS PANEL ─── */}
          <div className="flex justify-end px-6 pb-3">
            <div className="w-56 bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="space-y-1.5 text-[9px] font-normal">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isGst ? 'Taxable Amount' : 'Subtotal'}</span>
                  <span className="font-normal text-slate-800">₹{Number(totals.subtotal).toFixed(2)}</span>
                </div>
                {isGst && totals.cgst_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">CGST (9%)</span>
                    <span className="text-slate-700">₹{totals.cgst_total.toFixed(2)}</span>
                  </div>
                )}
                {isGst && totals.sgst_total > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">SGST (9%)</span>
                    <span className="text-slate-700">₹{totals.sgst_total.toFixed(2)}</span>
                  </div>
                )}
                {isGst && totals.igst_total > 0 && (
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
                {!isGst && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery</span>
                    <span className="text-slate-700">₹0.00</span>
                  </div>
                )}
                {Number(totals.round_off) !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Round Off</span>
                    <span className="text-slate-700">₹{totals.round_off.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-slate-300 pt-1.5 mt-1.5 flex justify-between font-bold text-slate-800">
                  <span className="uppercase text-[10px]">{isGst ? 'Grand Total' : 'TOTAL'}</span>
                  <span className="text-sm font-bold">₹{totals.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── AMOUNT IN WORDS ─── */}
          <div className="px-6 py-2 border-t border-slate-200 bg-slate-50/50">
            <span className="text-[8px] font-medium uppercase tracking-wide text-slate-500">Amount in Words: </span>
            <span className="text-[9px] font-normal text-slate-700 italic">{numberToWords(totals.grand_total)}</span>
          </div>

          {/* ─── BANK DETAILS + QR ─── */}
          <div className="grid grid-cols-2 gap-0 px-6 py-3 border-t border-slate-200">
            <div className="text-[8px] text-slate-500 space-y-0.5 font-normal">
              <div className="font-medium text-slate-700 uppercase text-[8px] tracking-wide mb-1">Bank Details</div>
              <div>Bank: <span className="font-normal text-slate-700">{sel.bank_name || '-'}</span></div>
              <div>A/C: <span className="font-normal text-slate-700">{sel.account_number || '-'}</span></div>
              <div>IFSC: <span className="font-normal text-slate-700">{sel.ifsc_code || '-'}</span></div>
              {sel.upi_id && <div>UPI: <span className="font-normal text-slate-700">{sel.upi_id}</span></div>}
            </div>
            <div className="flex flex-col items-end justify-start">
              {upiQrDataUrl ? (
                <div className="flex flex-col items-center">
                  <div className="text-[7px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Scan to Pay</div>
                  <img src={upiQrDataUrl} alt="UPI QR" className="w-14 h-14 border border-slate-300 rounded" />
                  <div className="text-[6px] text-slate-400 mt-0.5 max-w-[80px] break-all text-center">{sel.upi_id}</div>
                </div>
              ) : sel.upi_id ? (
                <div className="text-[8px] text-slate-400 italic self-end">UPI: {sel.upi_id}</div>
              ) : null}
            </div>
          </div>

          {/* ─── TERMS & SIGNATURE ─── */}
          <div className="grid grid-cols-2 gap-0 px-6 py-3 border-t border-slate-200">
            <div className="pr-4">
              <div className="text-[8px] font-medium uppercase tracking-wide text-slate-500 mb-0.5">Terms &amp; Conditions</div>
              <div className="text-[8px] text-slate-500 leading-relaxed whitespace-pre-line font-normal">{invoice.terms_conditions}</div>
            </div>
            <div className="flex flex-col items-end justify-end pl-4 border-l border-slate-200">
              <div className="text-right">
                <div className="text-[8px] text-slate-500 font-normal">For <span className="font-medium text-slate-700">{sel.business_name}</span></div>
                <div className="w-28 border-b border-dashed border-slate-300 mt-5 mb-0.5" />
                <div className="text-[9px] font-medium text-slate-700">Authorized Signature</div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[9px] text-slate-400 no-print">Powered by InvoiceFlow</p>
      </div>

      <ShareDialog
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        invoice={invoice}
        items={items}
      />
    </div>
  );
};
