import React, { useEffect } from 'react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  FileDown,
  MessageCircle,
  Mail,
  Link,
  X
} from 'lucide-react';
import { Invoice } from '../../types';
import { numberToWords } from '../../utils/gstEngine';
import { useApp } from '../../context/AppContext';
import { prefetchCache } from '../../services/prefetchCache';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  items: Invoice['items'];
}

export const ShareDialog: React.FC<ShareDialogProps> = ({ isOpen, onClose, invoice, items }) => {
  const { showToast, gstProfile, nongstProfile } = useApp();
  const isGst = invoice.invoice_type === 'GST';

  // Early Execution: Pre-calculate share payloads, QR code, and mailto strings
  useEffect(() => {
    if (isOpen && invoice) {
      const activeSeller = isGst ? gstProfile : nongstProfile;
      prefetchCache.precomputeSharePayload(invoice, activeSeller);
    }
  }, [isOpen, invoice, isGst, gstProfile, nongstProfile]);

  /**
   * Generates a PDF that mirrors the A4 Live Print View exactly.
   */
  const generatePdf = (qrDataUrl?: string): jsPDF => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const M = 14;                   // margin
    const W = 210 - M * 2;          // usable width (182)
    const R = M + W;                // right edge
    const PH = 297;
    let y = M;

    const sel = invoice.seller_snapshot || {} as any;
    const cust = invoice.customer_snapshot || {} as any;
    const rows = items || [];
    const isIGST = isGst && Number(invoice.igst_total) > 0;

    const lineAmt = (it: any) =>
      Number(it.rate) * Number(it.quantity) * (1 - (Number(it.discount_pct) || 0) / 100);
    const totalDiscount = rows.reduce((s: number, it: any) =>
      s + Number(it.rate) * Number(it.quantity) * ((Number(it.discount_pct) || 0) / 100), 0);

    const pageGuard = (h = 16) => { if (y + h > PH - M) { pdf.addPage(); y = M; } };

    // ─── 1. HEADER BAR (slate-800 background) ────────────────────────────
    const hdrH = 18;
    pdf.setFillColor(30, 41, 59);                // slate-800
    pdf.rect(M, y, W, hdrH, 'F');

    // Left: Logo (if any) + business name + address
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(255);
    pdf.text(sel.business_name || 'Business', M + 5, y + 7);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(203, 213, 225);
    const addr = [sel.address, sel.city, sel.state].filter(Boolean).join(', ');
    pdf.text(addr, M + 5, y + 12);

    // Right: "Original" badge for GST
    if (isGst) {
      pdf.setFontSize(5.5); pdf.setTextColor(252, 211, 77); pdf.setFont('helvetica', 'bold');
      pdf.text('ORIGINAL', R - 5, y + 7, { align: 'right' });
    }
    y += hdrH;

    // ─── 2. INVOICE META STRIP (slate-50 background) ─────────────────────
    const metaH = 8;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(M, y, W, metaH, 'F');
    pdf.setDrawColor(226, 232, 240); pdf.line(M, y + metaH, R, y + metaH); pdf.setDrawColor(0);

    pdf.setFontSize(7);
    let mx = M + 5;
    const metaLabel = (lbl: string, val: string) => {
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(71, 85, 105);
      pdf.text(lbl, mx, y + 5);
      const lw = pdf.getTextWidth(lbl);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 116, 139);
      pdf.text(' ' + val, mx + lw, y + 5);
      mx += lw + pdf.getTextWidth(' ' + val) + 8;
    };
    metaLabel(`${isGst ? 'Invoice' : 'Bill'} No:`, invoice.invoice_number);
    metaLabel('Date:', new Date(invoice.invoice_date).toLocaleDateString('en-IN'));
    if (invoice.due_date) metaLabel('Due:', new Date(invoice.due_date).toLocaleDateString('en-IN'));
    if (isGst) {
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(71, 85, 105);
      const posLbl = 'Place of Supply: ';
      pdf.text(posLbl, R - 5 - pdf.getTextWidth(posLbl + invoice.place_of_supply), y + 5);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 116, 139);
      pdf.text(invoice.place_of_supply, R - 5, y + 5, { align: 'right' });
    }
    y += metaH;

    // ─── 3. BILL FROM / BILL TO (2 equal columns) ───────────────────────
    y += 1;
    pdf.setDrawColor(226, 232, 240);
    const colMid = M + W / 2;

    // Left column: Bill From
    let lY = y + 3;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6); pdf.setTextColor(148, 163, 184);
    pdf.text('BILL FROM', M + 4, lY); lY += 3.5;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(30, 41, 59);
    pdf.text(sel.business_name, M + 4, lY); lY += 4.5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139);
    if (sel.gstin) { pdf.text(`GSTIN: ${sel.gstin}`, M + 4, lY); lY += 4; }
    pdf.text(addr, M + 4, lY); lY += 4;
    pdf.text(`Phone: ${sel.phone || ''}`, M + 4, lY); lY += 4;

    // Right column: Bill To
    let rY = y + 3;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6); pdf.setTextColor(148, 163, 184);
    pdf.text('BILL TO', colMid + 4, rY); rY += 3.5;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(30, 41, 59);
    pdf.text(cust.name || 'Customer Name', colMid + 4, rY); rY += 4.5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(100, 116, 139);
    if (cust.company_name) { pdf.text(cust.company_name, colMid + 4, rY); rY += 4; }
    if (cust.gstin) { pdf.text(`GSTIN: ${cust.gstin}`, colMid + 4, rY); rY += 4; }
    const custAddr = [cust.address, cust.city, cust.state].filter(Boolean).join(', ');
    if (custAddr) { pdf.text(custAddr, colMid + 4, rY); rY += 4; }
    if (cust.mobile) { pdf.text(`Phone: ${cust.mobile}`, colMid + 4, rY); rY += 4; }
    if (cust.email) { pdf.text(`Email: ${cust.email}`, colMid + 4, rY); rY += 4; }

    const billBottomY = Math.max(lY, rY) + 1;
    // Divider line
    pdf.line(colMid, y + 1, colMid, billBottomY);
    // Bottom border
    pdf.line(M, billBottomY, R, billBottomY);
    y = billBottomY + 2;

    // ─── 4. ITEMS TABLE ──────────────────────────────────────────────────
    pageGuard(18);

    // Columns match the live preview EXACTLY: # | Item | HSN? | Qty | Price | GST%? | Amount (No Discount Column!)
    const tCols: { lbl: string; w: number; align: 'left'|'center'|'right' }[] = isGst
      ? [
          { lbl: '#',      w: 6,  align: 'center' },
          { lbl: 'Item',   w: 78, align: 'left'   },
          { lbl: 'HSN',    w: 16, align: 'center' },
          { lbl: 'Qty',    w: 14, align: 'right'  },
          { lbl: 'Price',  w: 22, align: 'right'  },
          { lbl: 'GST %',  w: 16, align: 'right'  },
          { lbl: 'Amount', w: 30, align: 'right'  },
        ]
      : [
          { lbl: '#',      w: 6,  align: 'center' },
          { lbl: 'Item',   w: 92, align: 'left'   },
          { lbl: 'Qty',    w: 20, align: 'right'  },
          { lbl: 'Price',  w: 32, align: 'right'  },
          { lbl: 'Amount', w: 32, align: 'right'  },
        ];
    const tScale = W / tCols.reduce((s, c) => s + c.w, 0);
    const C = tCols.map(c => ({ ...c, w: c.w * tScale }));

    // Table header
    pdf.setFillColor(241, 245, 249);
    pdf.rect(M, y, W, 6, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
    let cx = M;
    C.forEach(c => {
      const tx = c.align === 'center' ? cx + c.w / 2 : c.align === 'right' ? cx + c.w - 2 : cx + 2;
      pdf.text(c.lbl.toUpperCase(), tx, y + 4, { align: c.align });
      cx += c.w;
    });
    y += 6;

    // Table rows
    pdf.setTextColor(30, 41, 59);
    rows.forEach((item: any, i: number) => {
      const descLines = pdf.splitTextToSize(item.product_name || '—', C[1].w - 4);
      const rowH = Math.max(6, descLines.length * 4 + 1);
      pageGuard(rowH + 2);

      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
      cx = M;
      C.forEach((col, ci) => {
        let v = '';
        if (ci === 0) {
          v = String(i + 1);
          pdf.setTextColor(160, 174, 192);
        } else if (ci === 1) {
          pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 41, 59);
          descLines.forEach((dl: string, di: number) => pdf.text(dl, cx + 2, y + 1.5 + di * 4));
          if (item.description) {
            pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(160, 174, 192);
            pdf.text(item.description, cx + 2, y + 1.5 + descLines.length * 4);
            pdf.setFontSize(7.5);
          }
          pdf.setFont('helvetica', 'normal');
          cx += col.w; return;
        } else if (isGst) {
          if (ci === 2) { v = item.hsn_code || '-'; pdf.setTextColor(100, 116, 139); }
          else if (ci === 3) { v = String(item.quantity); pdf.setTextColor(51, 65, 85); }
          else if (ci === 4) { v = `Rs. ${Number(item.rate).toFixed(2)}`; pdf.setTextColor(51, 65, 85); }
          else if (ci === 5) { v = `${item.gst_rate ?? 0}%`; pdf.setTextColor(71, 85, 105); }
          else if (ci === 6) { v = `Rs. ${lineAmt(item).toFixed(2)}`; pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 41, 59); }
        } else {
          if (ci === 2) { v = String(item.quantity); pdf.setTextColor(51, 65, 85); }
          else if (ci === 3) { v = `Rs. ${Number(item.rate).toFixed(2)}`; pdf.setTextColor(51, 65, 85); }
          else if (ci === 4) { v = `Rs. ${lineAmt(item).toFixed(2)}`; pdf.setFont('helvetica', 'bold'); pdf.setTextColor(30, 41, 59); }
        }
        const tx = col.align === 'center' ? cx + col.w / 2 : col.align === 'right' ? cx + col.w - 2 : cx + 2;
        pdf.text(v, tx, y + 1.5, { align: col.align });
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(30, 41, 59);
        cx += col.w;
      });

      y += rowH;
      pdf.setDrawColor(226, 232, 240); pdf.line(M, y, R, y); pdf.setDrawColor(0);
      y += 0.5;
    });
    y += 3;

    // ─── 5. TOTALS PANEL (right-aligned box, matching live preview) ──────
    pageGuard(32);
    const boxW = 56;
    const boxX = R - boxW - 2;

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);

    let boxLines = 1; // subtotal
    if (isGst && !isIGST && Number(invoice.cgst_total) > 0) boxLines++;
    if (isGst && !isIGST && Number(invoice.sgst_total) > 0) boxLines++;
    if (isGst && isIGST && Number(invoice.igst_total) > 0) boxLines++;
    if (totalDiscount > 0) boxLines++;
    if (!isGst) boxLines++; // Delivery line
    if (Number(invoice.round_off) !== 0) boxLines++;
    const boxH = boxLines * 4.5 + 9;

    pdf.roundedRect(boxX, y, boxW + 2, boxH, 1.5, 1.5, 'FD');
    pdf.setDrawColor(0);

    let bY = y + 3.5;
    const totRow = (label: string, value: string, isTotal = false) => {
      if (isTotal) {
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5); pdf.setTextColor(30, 41, 59);
        pdf.text(label, boxX + 3, bY);
        pdf.setFontSize(9.5);
        pdf.text(value, boxX + boxW - 1, bY, { align: 'right' });
      } else {
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
        pdf.text(label, boxX + 3, bY);
        pdf.setFont('helvetica', 'bold'); pdf.setTextColor(51, 65, 85);
        pdf.text(value, boxX + boxW - 1, bY, { align: 'right' });
        bY += 4.5;
      }
    };

    totRow(isGst ? 'Taxable Amount' : 'Subtotal', `Rs. ${Number(invoice.grand_total - (Number(invoice.cgst_total)||0) - (Number(invoice.sgst_total)||0) - (Number(invoice.igst_total)||0) - (Number(invoice.round_off)||0)).toFixed(2)}`);
    if (isGst && !isIGST && Number(invoice.cgst_total) > 0) totRow('CGST (9%)', `Rs. ${Number(invoice.cgst_total).toFixed(2)}`);
    if (isGst && !isIGST && Number(invoice.sgst_total) > 0) totRow('SGST (9%)', `Rs. ${Number(invoice.sgst_total).toFixed(2)}`);
    if (isGst && isIGST && Number(invoice.igst_total) > 0) totRow('IGST', `Rs. ${Number(invoice.igst_total).toFixed(2)}`);
    if (totalDiscount > 0) totRow('Discount', `-Rs. ${totalDiscount.toFixed(2)}`);
    if (!isGst) totRow('Delivery', 'Rs. 0.00');
    if (Number(invoice.round_off) !== 0) totRow('Round Off', `Rs. ${Number(invoice.round_off).toFixed(2)}`);

    // Grand total line separator + total (matches live print view)
    pdf.setDrawColor(203, 213, 225); pdf.line(boxX + 3, bY - 1, boxX + boxW - 1, bY - 1); pdf.setDrawColor(0);
    bY += 3.5;
    totRow(isGst ? 'GRAND TOTAL' : 'TOTAL', `Rs. ${Number(invoice.grand_total).toFixed(2)}`, true);

    y += boxH + 3;

    // ─── 6. AMOUNT IN WORDS (light strip) ────────────────────────────────
    pageGuard(8);
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.rect(M, y, W, 6, 'F');
    pdf.line(M, y, R, y); pdf.line(M, y + 6, R, y + 6);
    pdf.setDrawColor(0);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6); pdf.setTextColor(100, 116, 139);
    pdf.text('AMOUNT IN WORDS:', M + 3, y + 4);
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(51, 65, 85);
    pdf.text(numberToWords(Number(invoice.grand_total)), M + 32, y + 4);
    y += 6;

    // ─── 7. BANK DETAILS + QR CODE (2 columns) ──────────────────────────
    pageGuard(22);
    y += 2;

    let bankEndY = y + 3;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
    pdf.text('BANK DETAILS', M + 3, bankEndY); bankEndY += 3.5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7); pdf.setTextColor(100, 116, 139);
    const bankLine = (lbl: string, val: string) => {
      pdf.text(lbl, M + 3, bankEndY);
      pdf.setFont('helvetica', 'bold'); pdf.setTextColor(51, 65, 85);
      pdf.text(val, M + 14, bankEndY);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 116, 139);
      bankEndY += 3.5;
    };
    if (sel.bank_name) bankLine('Bank:', sel.bank_name);
    if (sel.account_number) bankLine('A/C:', sel.account_number);
    if (sel.ifsc_code) bankLine('IFSC:', sel.ifsc_code);
    if (sel.upi_id) bankLine('UPI:', sel.upi_id);

    // Right: QR code
    let qrEndY = y + 2;
    if (qrDataUrl && sel.upi_id) {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(5.5); pdf.setTextColor(100, 116, 139);
      pdf.text('SCAN TO PAY', R - 14, qrEndY, { align: 'center' }); qrEndY += 1.5;
      try {
        pdf.addImage(qrDataUrl, 'PNG', R - 24, qrEndY, 18, 18);
      } catch { /* silently skip */ }
      qrEndY += 19;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(4.5); pdf.setTextColor(160, 174, 192);
      pdf.text(sel.upi_id, R - 14, qrEndY, { align: 'center' });
      qrEndY += 3;
    }
    y = Math.max(bankEndY, qrEndY) + 2;

    // ─── 8. TERMS & SIGNATURE (2 columns) ────────────────────────────────
    pageGuard(22);
    pdf.setDrawColor(226, 232, 240); pdf.line(M, y, R, y); pdf.setDrawColor(0);
    y += 2;

    // Left: Terms
    let termsEndY = y + 3;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
    pdf.text('TERMS & CONDITIONS', M + 3, termsEndY); termsEndY += 3.5;
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6); pdf.setTextColor(100, 116, 139);
    const termsText = invoice.terms_conditions || '1. Please pay within due date.\n2. Goods once sold will not be taken back.';
    const tLines = pdf.splitTextToSize(termsText, W / 2 - 8);
    tLines.forEach((l: string) => { pdf.text(l, M + 3, termsEndY); termsEndY += 3; });

    // Divider line
    pdf.setDrawColor(226, 232, 240);
    pdf.line(colMid, y + 1, colMid, Math.max(termsEndY, y + 18));
    pdf.setDrawColor(0);

    // Right: Signature
    const sigBaseY = Math.max(termsEndY, y + 16);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(6.5); pdf.setTextColor(100, 116, 139);
    pdf.text('For ', R - 4 - pdf.getTextWidth(sel.business_name || ''), sigBaseY - 6);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(51, 65, 85);
    pdf.text(sel.business_name, R - 4, sigBaseY - 6, { align: 'right' });

    // Dashed line
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineDashPattern([1, 1], 0);
    pdf.line(R - 34, sigBaseY, R - 4, sigBaseY);
    pdf.setLineDashPattern([], 0);
    pdf.setDrawColor(0);

    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(51, 65, 85);
    pdf.text('Authorized Signature', R - 4, sigBaseY + 3.5, { align: 'right' });

    return pdf;
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    showToast('Generating PDF...', 'info');
    try {
      let qrDataUrl: string | undefined;
      const sel = invoice.seller_snapshot || {} as any;
      if (sel.upi_id) {
        const upiStr = `upi://pay?pa=${encodeURIComponent(sel.upi_id)}&pn=${encodeURIComponent(sel.business_name || '')}&am=${Number(invoice.grand_total).toFixed(2)}&cu=INR&tn=${encodeURIComponent('Inv ' + invoice.invoice_number)}`;
        try {
          qrDataUrl = await QRCode.toDataURL(upiStr, { width: 200, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } });
        } catch { /* continue without QR */ }
      }
      const pdf = generatePdf(qrDataUrl);
      pdf.save(`${invoice.invoice_number}.pdf`);
      showToast('PDF downloaded!', 'success');
      onClose();
    } catch {
      showToast('Failed to generate PDF', 'danger');
    }
  };

  const handleWhatsApp = () => {
    const custPhone = invoice.customer_snapshot?.mobile ? invoice.customer_snapshot.mobile.replace(/\D/g, '') : '';
    const phoneParam = custPhone ? (custPhone.length === 10 ? `91${custPhone}` : custPhone) : '';
    
    const text = [
      `*${isGst ? 'TAX INVOICE' : 'INVOICE'}: ${invoice.invoice_number}*`,
      `Greetings from ${invoice.seller_snapshot?.business_name || 'our store'}!`,
      `Customer: ${invoice.customer_snapshot?.name || 'Valued Customer'}`,
      `Total Amount: ₹${Number(invoice.grand_total).toFixed(2)}`,
      `Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`,
      `Status: ${invoice.payment_status}`,
      ``,
      `View Invoice online: ${window.location.origin}/invoice/${invoice.id}`,
      `Thank you for your business!`
    ].join('\n');

    const targetUrl = phoneParam 
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(targetUrl, '_blank');
    onClose();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`${isGst ? 'Tax Invoice' : 'Invoice'} ${invoice.invoice_number}`);
    const body = encodeURIComponent([
      `${isGst ? 'TAX INVOICE' : 'INVOICE'}: ${invoice.invoice_number}`,
      `Date: ${new Date(invoice.invoice_date).toLocaleDateString('en-IN')}`,
      `Customer: ${invoice.customer_snapshot.name}`,
      `Amount: ₹${Number(invoice.grand_total).toFixed(2)}`,
      `Status: ${invoice.payment_status}`,
      ``,
      `View: ${window.location.origin}/invoice/${invoice.id}`,
    ].join('\n'));
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    onClose();
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/invoice/${invoice.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('Invoice link copied!', 'success');
    } catch {
      showToast('Failed to copy link', 'danger');
    }
    onClose();
  };

  const actions = [
    { icon: FileDown, label: 'Download PDF', desc: 'Save as PDF file', onClick: handleDownload, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400' },
    { icon: MessageCircle, label: 'WhatsApp', desc: 'Share invoice link', onClick: handleWhatsApp, color: 'text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400' },
    { icon: Mail, label: 'Email', desc: 'Send via email', onClick: handleEmail, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/20 dark:text-rose-400' },
    { icon: Link, label: 'Copy Link', desc: 'Copy shareable link', onClick: handleCopyLink, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/20 dark:text-purple-400' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60 transition-opacity duration-200"
      />
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-premium z-10 p-6 transition-all duration-200"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-text-primary dark:text-slate-100">Share Invoice</h3>
            <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5">{invoice.invoice_number} — ₹{Number(invoice.grand_total).toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:shadow-soft transition-all ${action.color}`}
            >
              <action.icon className="h-6 w-6" />
              <span className="text-xs font-bold">{action.label}</span>
              <span className="text-[9px] text-text-secondary dark:text-slate-500">{action.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
