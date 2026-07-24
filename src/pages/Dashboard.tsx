import React, { useEffect, useState } from 'react';
import { useApp, ActivePage } from '../context/AppContext';
import { api } from '../services/api';
import { 
  IndianRupee, 
  Users, 
  Package, 
  Percent, 
  ArrowUpRight, 
  TrendingUp, 
  Plus, 
  ExternalLink,
  Sparkles,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  ShieldCheck,
  Zap
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { invoices, customers, products, setActivePage, setSelectedInvoiceIdForEdit } = useApp();
  const [apiStats, setApiStats] = useState<any>(null);

  useEffect(() => {
    api.getDashboardStats()
      .then(setApiStats)
      .catch((e) => console.error('Failed to load backend stats:', e));
  }, []);

  const formatRupee = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value || 0);
  };

  const handleQuickAction = (page: ActivePage) => {
    setSelectedInvoiceIdForEdit(null);
    setActivePage(page);
  };

  // Real-time calculation from client state (with API fallback)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];

  const monthlyInvoices = invoices.filter(inv => {
    const d = new Date(inv.invoice_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const liveMonthlySales = monthlyInvoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const monthlySales = invoices.length > 0 ? liveMonthlySales : (apiStats?.monthlySales || 0);

  const todayInvoicesList = invoices.filter(inv => inv.invoice_date === todayStr);
  const liveTodaySales = todayInvoicesList.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const todaySales = invoices.length > 0 ? liveTodaySales : (apiStats?.todaySales || 0);
  const todayInvoicesCount = invoices.length > 0 ? todayInvoicesList.length : (apiStats?.todayInvoices || 0);

  const liveGstCollected = invoices.reduce((sum, inv) => sum + (Number(inv.cgst_total || 0) + Number(inv.sgst_total || 0) + Number(inv.igst_total || 0)), 0);
  const totalGstCollected = invoices.length > 0 ? liveGstCollected : (apiStats?.totalGstCollected || 0);

  const recentInvoicesList = invoices.length > 0 ? invoices.slice(0, 5) : (apiStats?.recentInvoices || []);

  // Dynamic monthly points calculation for custom SVG line chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTotals = months.map((_, idx) => {
    return invoices
      .filter(inv => {
        const d = new Date(inv.invoice_date);
        return d.getMonth() === idx && d.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  });

  const maxMonthlyVal = Math.max(...monthlyTotals, 1000);
  const graphPoints = monthlyTotals.map(val => (val / maxMonthlyVal) * 100 + 15);
  const maxPoint = Math.max(...graphPoints);
  
  const width = 500;
  const height = 170;
  const padding = 16;
  const points = graphPoints.map((val, idx) => {
    const x = padding + (idx / (graphPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - (val / maxPoint) * (height - padding * 2);
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  const todayDateStr = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0A1128] via-[#0062FF] to-[#0A1128] rounded-3xl p-6 md:p-8 text-white shadow-premium border border-slate-800/80">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 text-blue-300" />
              <span>{todayDateStr}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              invoiceflow<span className="text-blue-300 font-bold">-billing</span>
            </h1>
            <p className="text-xs md:text-sm text-blue-100 max-w-xl font-normal tracking-wide">
              Create. Manage. Get Paid. Real-time invoicing dashboard.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleQuickAction('gst-invoice')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-blue-600 hover:bg-blue-50 text-xs font-normal shadow-card active:scale-95 transition-all"
            >
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>+ GST Bill</span>
            </button>

            <button
              onClick={() => handleQuickAction('nongst-invoice')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-900/60 hover:bg-blue-900/80 text-white text-xs font-normal border border-blue-400/30 transition-all active:scale-95"
            >
              <FileText className="h-4 w-4" />
              <span>+ Non-GST</span>
            </button>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-400/30 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 Brand Pillars Feature Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div 
          onClick={() => handleQuickAction('gst-invoice')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center gap-3 cursor-pointer hover-lift group"
        >
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Invoices</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Create easily</div>
          </div>
        </div>

        <div 
          onClick={() => handleQuickAction('invoice-history')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center gap-3 cursor-pointer hover-lift group"
        >
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 group-hover:scale-110 transition-transform">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Flow</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Streamline workflow</div>
          </div>
        </div>

        <div 
          onClick={() => handleQuickAction('reports')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center gap-3 cursor-pointer hover-lift group"
        >
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Manage</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Track & organize</div>
          </div>
        </div>

        <div 
          onClick={() => handleQuickAction('invoice-history')}
          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center gap-3 cursor-pointer hover-lift group"
        >
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-900 dark:text-white uppercase tracking-wider">Get Paid</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">Faster & securely</div>
          </div>
        </div>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Box 1: Monthly Sales Volume */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600/10 via-blue-600/5 to-transparent dark:from-blue-600/20 dark:to-transparent border border-blue-200/50 dark:border-slate-800 rounded-3xl p-6 shadow-soft flex flex-col justify-between hover-lift">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Performance</span>
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Monthly Sales Volume</h3>
            </div>
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-card shadow-blue-600/30">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{formatRupee(monthlySales)}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">Sales recorded in {months[currentMonth]}</p>
          </div>
        </div>

        {/* Box 2: Today's Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-soft flex flex-col justify-between hover-lift">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">Today's Sales</h3>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupee(todaySales)}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">{todayInvoicesCount} bills generated today</p>
          </div>
        </div>

        {/* Box 3: GST Tax Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-soft flex flex-col justify-between hover-lift">
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400">GST Collected</h3>
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{formatRupee(totalGstCollected)}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">CGST + SGST + IGST accumulated</p>
          </div>
        </div>
      </div>

      {/* Analytics Graph & Quick Directory Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sales Growth Chart */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Analytics</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Live Revenue Growth Trend</h3>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 text-xs font-medium">
              <span>Real-time</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          
          <div className="relative pt-4 w-full flex-grow flex flex-col justify-end">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              
              {[0, 0.33, 0.66, 1].map((r, i) => {
                const y = padding + r * (height - padding * 2);
                return (
                  <line 
                    key={i} 
                    x1={padding} 
                    y1={y} 
                    x2={width - padding} 
                    y2={y} 
                    className="stroke-slate-100 dark:stroke-slate-800" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />
                );
              })}
              
              <path d={areaD} fill="url(#chartGradient)" />
              <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              
              {points.map((pt, idx) => {
                const [x, y] = pt.split(',');
                return (
                  <g key={idx} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r="6" className="fill-white stroke-blue-600 stroke-2 dark:fill-slate-900" />
                    <circle cx={x} cy={y} r="2.5" className="fill-blue-600" />
                  </g>
                );
              })}
            </svg>

            <div className="flex justify-between px-2 text-[10px] text-slate-400 font-medium mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
              {months.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Counters & Quick Shortcuts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-soft flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Directory</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Quick Navigation</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickAction('gst-invoice')}
                className="flex flex-col gap-1 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all text-left group"
              >
                <Plus className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-normal text-slate-900 dark:text-slate-200">GST Bill</span>
              </button>

              <button
                onClick={() => handleQuickAction('customers')}
                className="flex flex-col gap-1 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-all text-left group"
              >
                <Users className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-normal text-slate-900 dark:text-slate-200">Customers</span>
              </button>

              <button
                onClick={() => handleQuickAction('products')}
                className="flex flex-col gap-1 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-slate-800 transition-all text-left group"
              >
                <Package className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-normal text-slate-900 dark:text-slate-200">Inventory</span>
              </button>

              <button
                onClick={() => handleQuickAction('reports')}
                className="flex flex-col gap-1 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-slate-800 transition-all text-left group"
              >
                <TrendingUp className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-normal text-slate-900 dark:text-slate-200">Analytics</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center text-xs font-normal text-slate-500 dark:text-slate-400">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
              <div className="text-slate-900 dark:text-white font-bold text-base">{customers.length}</div>
              <div className="text-[9px] text-slate-400 uppercase font-medium tracking-wider mt-0.5">Customers</div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl">
              <div className="text-slate-900 dark:text-white font-bold text-base">{products.length}</div>
              <div className="text-[9px] text-slate-400 uppercase font-medium tracking-wider mt-0.5">Products</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Invoices</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Latest bills issued</p>
          </div>
          <button 
            onClick={() => handleQuickAction('invoice-history')} 
            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-normal hover:underline"
          >
            <span>View All ({invoices.length})</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-3">
          {recentInvoicesList && recentInvoicesList.length > 0 ? (
            recentInvoicesList.map((inv: any) => (
              <div 
                key={inv.id} 
                onClick={() => {
                  setSelectedInvoiceIdForEdit(inv.id);
                  setActivePage(inv.invoice_type === 'GST' ? 'gst-invoice' : 'nongst-invoice');
                }}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-normal text-sm text-slate-900 dark:text-white">{inv.invoice_number}</span>
                    <span className={`px-2 py-0.5 text-[9px] font-medium uppercase rounded-full border ${
                      inv.payment_status === 'Paid' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40' 
                        : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40'
                    }`}>
                      {inv.payment_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-normal">{inv.customer_snapshot?.name || 'Customer'}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{formatRupee(inv.grand_total)}</div>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">Edit →</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 font-normal">No invoices generated yet. Click "+ GST Bill" to create your first invoice.</div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pl-2">Invoice No</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
              {recentInvoicesList && recentInvoicesList.length > 0 ? (
                recentInvoicesList.map((inv: any) => (
                  <tr key={inv.id} className="text-sm text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 font-normal pl-2">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3.5">
                      <div className="font-normal text-slate-900 dark:text-white">
                        {inv.customer_snapshot?.name || 'Customer'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {inv.customer_snapshot?.company_name || 'Individual'}
                      </div>
                    </td>
                    <td className="py-3.5 text-xs font-normal text-slate-500">
                      {inv.invoice_type}
                    </td>
                    <td className="py-3.5 text-xs text-slate-500">
                      {new Date(inv.invoice_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3.5 font-bold text-slate-900 dark:text-white">
                      {formatRupee(inv.grand_total)}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-medium uppercase border
                        ${inv.payment_status === 'Paid' 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-800/30 dark:text-emerald-400' 
                          : 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800/30 dark:text-amber-400'
                        }
                      `}>
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-2">
                      <button
                        onClick={() => {
                          setSelectedInvoiceIdForEdit(inv.id);
                          setActivePage(inv.invoice_type === 'GST' ? 'gst-invoice' : 'nongst-invoice');
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 font-normal hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-500 font-normal">
                    No recent invoices found. Click "+ GST Bill" to create your first invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
