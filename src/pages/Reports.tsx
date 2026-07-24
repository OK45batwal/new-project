import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ReportData } from '../types';
import { 
  Download, 
  Calendar, 
  IndianRupee, 
  Percent, 
  Calculator,
  User,
  Package,
  FileText
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useApp();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    // Default to 30 days ago
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sales' | 'gst' | 'products' | 'customers'>('sales');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const data = await api.getReportData(startDate, endDate);
        setReport(data);
      } catch (e: any) {
        showToast(e.message, 'danger');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [startDate, endDate, showToast]);

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(value || 0);
  };

  // Export to CSV helper
  const exportToCSV = (data: any[], fileName: string) => {
    if (data.length === 0) {
      showToast('No data to export', 'warning');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(row => 
        headers.map(fieldName => {
          let value = row[fieldName];
          if (value === null || value === undefined) return '""';
          // Escape quotes
          value = String(value).replace(/"/g, '""');
          return `"${value}"`;
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report exported successfully!', 'success');
  };

  // Compile Product sales breakdown
  const getProductBreakdown = () => {
    if (!report?.invoices) return [];
    
    const prodMap: Record<string, { name: string; sku: string; hsn: string; qty: number; sales: number }> = {};
    
    report.invoices.forEach(inv => {
      if (inv.items) {
        inv.items.forEach(item => {
          const key = item.product_name;
          if (!prodMap[key]) {
            prodMap[key] = {
              name: item.product_name,
              sku: item.hsn_code || '-', // Fallback
              hsn: item.hsn_code || '-',
              qty: 0,
              sales: 0
            };
          }
          prodMap[key].qty += Number(item.quantity) || 0;
          prodMap[key].sales += Number(item.amount) || 0;
        });
      }
    });

    return Object.values(prodMap).sort((a, b) => b.sales - a.sales);
  };

  // Compile Customer sales breakdown
  const getCustomerBreakdown = () => {
    if (!report?.invoices) return [];
    
    const custMap: Record<string, { name: string; company: string; count: number; sales: number }> = {};
    
    report.invoices.forEach(inv => {
      const key = inv.customer_snapshot.name;
      if (!custMap[key]) {
        custMap[key] = {
          name: inv.customer_snapshot.name,
          company: inv.customer_snapshot.company_name || 'Individual',
          count: 0,
          sales: 0
        };
      }
      custMap[key].count += 1;
      custMap[key].sales += Number(inv.grand_total) || 0;
    });

    return Object.values(custMap).sort((a, b) => b.sales - a.sales);
  };

  // Compile GSTR-1 sales breakdown
  const getGstrBreakdown = () => {
    if (!report?.invoices) return [];
    
    return report.invoices
      .filter(i => i.invoice_type === 'GST')
      .map(i => ({
        'Invoice No': i.invoice_number,
        'Date': i.invoice_date,
        'Buyer Name': i.customer_snapshot.name,
        'Buyer GSTIN': i.customer_snapshot.gstin || 'URP (Unregistered)',
        'Place of Supply': i.place_of_supply,
        'Taxable Value (₹)': i.subtotal,
        'CGST (₹)': i.cgst_total,
        'SGST (₹)': i.sgst_total,
        'IGST (₹)': i.igst_total,
        'Invoice Value (₹)': i.grand_total
      }));
  };

  const handleExport = () => {
    if (activeTab === 'gst') {
      const data = getGstrBreakdown();
      exportToCSV(data, 'gstr1_report');
    } else if (activeTab === 'products') {
      const data = getProductBreakdown().map(p => ({
        'Product Name': p.name,
        'HSN': p.hsn,
        'Quantity Sold': p.qty,
        'Total Revenue (₹)': p.sales
      }));
      exportToCSV(data, 'product_sales_report');
    } else if (activeTab === 'customers') {
      const data = getCustomerBreakdown().map(c => ({
        'Customer Name': c.name,
        'Company': c.company,
        'Total Invoices': c.count,
        'Total Revenue (₹)': c.sales
      }));
      exportToCSV(data, 'customer_sales_report');
    } else {
      // Sales summary
      const data = report?.invoices.map(i => ({
        'Invoice Number': i.invoice_number,
        'Date': i.invoice_date,
        'Type': i.invoice_type,
        'Customer': i.customer_snapshot.name,
        'Subtotal (₹)': i.subtotal,
        'Tax (₹)': i.cgst_total + i.sgst_total + i.igst_total,
        'Total (₹)': i.grand_total,
        'Status': i.payment_status
      })) || [];
      exportToCSV(data, 'sales_ledger_report');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Date Range Picker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-soft flex flex-wrap gap-4 items-center justify-between no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4.5 w-4.5 text-text-light dark:text-slate-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-400 font-semibold"
              title="Start Date"
            />
          </div>
          <span className="text-text-light dark:text-slate-500 font-bold">to</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 text-xs bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-800 rounded-xl focus:outline-none text-text-secondary dark:text-slate-400 font-semibold"
              title="End Date"
            />
          </div>
        </div>

        <button
          onClick={handleExport}
          className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-750 text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5"
        >
          <Download className="h-4 w-4" />
          <span>Export Excel/CSV</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary dark:text-slate-500">Gross Turnover</span>
          <h2 className="text-xl font-bold text-text-primary dark:text-slate-150">{formatRupee(report?.totalSales || 0)}</h2>
          <div className="text-[10px] text-text-light dark:text-slate-500 flex items-center gap-1 font-normal">
            <IndianRupee className="h-3 w-3" />
            <span>Inclusive of all taxes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary dark:text-slate-500">Total Tax Collected</span>
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatRupee(report?.totalTax || 0)}</h2>
          <div className="text-[10px] text-text-light dark:text-slate-500 flex items-center gap-1 font-normal">
            <Percent className="h-3 w-3" />
            <span>CGST + SGST + IGST</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary dark:text-slate-500">CGST + SGST Split</span>
          <h2 className="text-xl font-bold text-text-primary dark:text-slate-150">
            {formatRupee((report?.totalCgst || 0) + (report?.totalSgst || 0))}
          </h2>
          <div className="text-[10px] text-text-light dark:text-slate-500 font-normal">
            CGST: {formatRupee(report?.totalCgst || 0)} | SGST: {formatRupee(report?.totalSgst || 0)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft space-y-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary dark:text-slate-500">IGST (Inter-State)</span>
          <h2 className="text-xl font-bold text-text-primary dark:text-slate-150">{formatRupee(report?.totalIgst || 0)}</h2>
          <div className="text-[10px] text-text-light dark:text-slate-500 flex items-center gap-1 font-normal">
            <Calculator className="h-3 w-3" />
            <span>Out of state transactions</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-soft overflow-hidden">
        {/* Navigation tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-850 px-4 pt-2 no-print">
          {[
            { id: 'sales', name: 'Sales Ledger', icon: FileText },
            { id: 'gst', name: 'GSTR-1 Returns', icon: Calculator },
            { id: 'products', name: 'Product Analytics', icon: Package },
            { id: 'customers', name: 'Customer Sales', icon: User },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3.5 border-b-2 text-xs font-bold transition-all duration-150
                  ${active 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-text-secondary hover:text-text-primary dark:text-slate-400 dark:hover:text-slate-200'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content panel */}
        <div className="p-6">
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="h-8 bg-slate-50 dark:bg-slate-800/40 rounded animate-pulse w-1/4" />
              <div className="h-32 bg-slate-50 dark:bg-slate-800/40 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              {/* Sales Ledger tab */}
              {activeTab === 'sales' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">Ledger of all invoices</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                          <th className="py-2.5 pl-2">Invoice No</th>
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5">Customer Name</th>
                          <th className="py-2.5">Type</th>
                          <th className="py-2.5 text-right">Subtotal</th>
                          <th className="py-2.5 text-right">Tax Value</th>
                          <th className="py-2.5 text-right">Invoice Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                        {report?.invoices && report.invoices.length > 0 ? (
                          report.invoices.map(inv => {
                            const tax = inv.cgst_total + inv.sgst_total + inv.igst_total;
                            return (
                              <tr key={inv.id} className="text-text-primary dark:text-slate-350 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                                <td className="py-3 pl-2 font-bold">{inv.invoice_number}</td>
                                <td className="py-3">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                                <td className="py-3 font-semibold">{inv.customer_snapshot.name}</td>
                                <td className="py-3 text-[10px] font-bold text-text-secondary">{inv.invoice_type}</td>
                                <td className="py-3 text-right">{formatRupee(inv.subtotal)}</td>
                                <td className="py-3 text-right text-blue-600 dark:text-blue-400">{formatRupee(tax)}</td>
                                <td className="py-3 text-right font-extrabold text-text-primary dark:text-slate-200">{formatRupee(inv.grand_total)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-text-secondary">No transaction records matching this range.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* GSTR-1 returns tab */}
              {activeTab === 'gst' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">GSTR-1 Tax Return Ledgers (GST Invoices Only)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                          <th className="py-2.5 pl-2">Invoice No</th>
                          <th className="py-2.5">Buyer Name</th>
                          <th className="py-2.5">Buyer GSTIN</th>
                          <th className="py-2.5">POS State</th>
                          <th className="py-2.5 text-right">Taxable Value</th>
                          <th className="py-2.5 text-right">CGST</th>
                          <th className="py-2.5 text-right">SGST</th>
                          <th className="py-2.5 text-right">IGST</th>
                          <th className="py-2.5 text-right">Total Invoice</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                        {report?.invoices && report.invoices.filter(i => i.invoice_type === 'GST').length > 0 ? (
                          report.invoices.filter(i => i.invoice_type === 'GST').map(inv => (
                            <tr key={inv.id} className="text-text-primary dark:text-slate-350 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                              <td className="py-3 pl-2 font-bold">{inv.invoice_number}</td>
                              <td className="py-3 font-semibold">{inv.customer_snapshot.name}</td>
                              <td className="py-3 font-semibold">{inv.customer_snapshot.gstin || 'Unregistered'}</td>
                              <td className="py-3">{inv.place_of_supply}</td>
                              <td className="py-3 text-right">{formatRupee(inv.subtotal)}</td>
                              <td className="py-3 text-right">{formatRupee(inv.cgst_total)}</td>
                              <td className="py-3 text-right">{formatRupee(inv.sgst_total)}</td>
                              <td className="py-3 text-right">{formatRupee(inv.igst_total)}</td>
                              <td className="py-3 text-right font-extrabold text-text-primary dark:text-slate-200">{formatRupee(inv.grand_total)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="text-center py-6 text-text-secondary">No GST transactions registered in this period.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Product Analytics tab */}
              {activeTab === 'products' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">Product inventory sales turnover</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                          <th className="py-2.5 pl-2">Product Name</th>
                          <th className="py-2.5">HSN Code</th>
                          <th className="py-2.5 text-right">Units Sold</th>
                          <th className="py-2.5 text-right">Sales Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                        {getProductBreakdown().length > 0 ? (
                          getProductBreakdown().map((prod: any) => (
                            <tr key={prod.name} className="text-text-primary dark:text-slate-350 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                              <td className="py-3 pl-2 font-bold">{prod.name}</td>
                              <td className="py-3 text-text-secondary">{prod.hsn}</td>
                              <td className="py-3 text-right font-bold">{prod.qty}</td>
                              <td className="py-3 text-right font-extrabold text-text-primary dark:text-slate-200">{formatRupee(prod.sales)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-text-secondary">No items registered in transaction history.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Customer Sales tab */}
              {activeTab === 'customers' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-slate-400">Customer account billed revenue</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 font-bold text-text-secondary dark:text-slate-500 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                          <th className="py-2.5 pl-2">Customer Account</th>
                          <th className="py-2.5">Company Name</th>
                          <th className="py-2.5 text-center">Invoices Generated</th>
                          <th className="py-2.5 text-right">Billed Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                        {getCustomerBreakdown().length > 0 ? (
                          getCustomerBreakdown().map((cust: any) => (
                            <tr key={cust.name} className="text-text-primary dark:text-slate-350 hover:bg-slate-50/30 dark:hover:bg-slate-800/10">
                              <td className="py-3 pl-2 font-bold">{cust.name}</td>
                              <td className="py-3 text-text-secondary">{cust.company}</td>
                              <td className="py-3 text-center font-bold">{cust.count}</td>
                              <td className="py-3 text-right font-extrabold text-text-primary dark:text-slate-200">{formatRupee(cust.sales)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="text-center py-6 text-text-secondary">No customer transactions recorded in this range.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
