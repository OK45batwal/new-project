import React, { useState } from 'react';
import { useApp, ActivePage } from '../../context/AppContext';
import { prefetchCache } from '../../services/prefetchCache';
import { Logo } from '../common/Logo';
import { Menu, Sun, Moon, Search, Wifi, WifiOff, Building, Plus } from 'lucide-react';

interface NavbarProps {
  collapsed: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  collapsed,
  setMobileOpen
}) => {
  const { 
    activePage, 
    setActivePage,
    gstProfile,
    nongstProfile,
    isOffline, 
    theme, 
    toggleTheme,
    customers,
    products,
    invoices,
    setSelectedInvoiceIdForEdit
  } = useApp();

  const profile = activePage === 'nongst-invoice' ? (nongstProfile || gstProfile) : (gstProfile || nongstProfile);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Translate page ID to Display Title
  const getPageTitle = (page: ActivePage): string => {
    switch (page) {
      case 'dashboard': return 'Dashboard';
      case 'gst-invoice': return 'New GST Invoice';
      case 'nongst-invoice': return 'New Non-GST Invoice';
      case 'invoice-history': return 'Invoice Registry';
      case 'customers': return 'Customer Database';
      case 'products': return 'Inventory & Products';
      case 'reports': return 'Financial Analytics';
      case 'settings': return 'System Settings';
      default: return 'Billing Software';
    }
  };

  // Perform a global search
  const getSearchResults = () => {
    if (!searchQuery.trim()) return { customers: [], products: [], invoices: [] };
    const q = searchQuery.toLowerCase().trim();

    const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.company_name && c.company_name.toLowerCase().includes(q)) ||
      c.mobile.includes(q)
    ).slice(0, 3);

    const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.hsn_code && p.hsn_code.includes(q))
    ).slice(0, 3);

    const filteredInvoices = invoices.filter(i => 
      i.invoice_number.toLowerCase().includes(q) || 
      i.customer_snapshot.name.toLowerCase().includes(q)
    ).slice(0, 3);

    return {
      customers: filteredCustomers,
      products: filteredProducts,
      invoices: filteredInvoices
    };
  };

  const results = getSearchResults();
  const hasResults = results.customers.length > 0 || results.products.length > 0 || results.invoices.length > 0;

  const handleSearchResultClick = (page: ActivePage, id?: string) => {
    if (page === 'gst-invoice' || page === 'nongst-invoice') {
      setSelectedInvoiceIdForEdit(id || null);
    }
    setActivePage(page);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const leftMargin = collapsed ? 'lg:pl-20' : 'lg:pl-64';

  return (
    <header className={`sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out no-print ${leftMargin}`}>
      {/* Left section: Mobile menu & Page Title / Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Mobile Header Logo */}
        <div className="lg:hidden flex items-center">
          <Logo variant="mark" size="sm" />
        </div>

        <h1 className="hidden sm:block text-base font-bold text-slate-900 dark:text-white md:text-lg tracking-tight">
          {getPageTitle(activePage)}
        </h1>
      </div>

      {/* Right section: Search bar, Quick Action, Status, Theme toggle, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search */}
        <div className="relative hidden md:block w-56 lg:w-72">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Search invoices, products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="w-full h-9 pl-9 pr-8 text-xs bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 transition-all"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-medium text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 dark:text-slate-400 rounded-md">
              ⌘K
            </kbd>
          </div>

          {/* Search dropdown results */}
          {showSearchResults && searchQuery.trim() && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSearchResults(false)} />
              <div className="absolute right-0 top-11 z-20 w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-premium overflow-hidden p-2">
                {hasResults ? (
                  <div className="space-y-3 p-1 max-h-80 overflow-y-auto">
                    {/* Invoices */}
                    {results.invoices.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1">Invoices</div>
                        {results.invoices.map(inv => (
                          <button
                            key={inv.id}
                            onClick={() => handleSearchResultClick('invoice-history')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/60 flex flex-col transition-colors"
                          >
                            <span className="text-xs font-normal text-slate-900 dark:text-slate-200">{inv.invoice_number}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{inv.customer_snapshot.name} | ₹{inv.grand_total}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Products */}
                    {results.products.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1">Products</div>
                        {results.products.map(prod => (
                          <button
                            key={prod.id}
                            onClick={() => handleSearchResultClick('products')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/60 flex flex-col transition-colors"
                          >
                            <span className="text-xs font-normal text-slate-900 dark:text-slate-200">{prod.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{prod.hsn_code ? `HSN: ${prod.hsn_code} | ` : ''}Rate: ₹{prod.selling_price}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Customers */}
                    {results.customers.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase font-medium tracking-wider text-slate-400 dark:text-slate-500 px-2.5 py-1">Customers</div>
                        {results.customers.map(cust => (
                          <button
                            key={cust.id}
                            onClick={() => handleSearchResultClick('customers')}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-slate-800/60 flex flex-col transition-colors"
                          >
                            <span className="text-xs font-normal text-slate-900 dark:text-slate-200">{cust.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">{cust.company_name || 'Individual'} | {cust.mobile}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-center text-slate-500 dark:text-slate-400 py-6 font-normal">
                    No records matched "{searchQuery}"
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Quick New Invoice Button */}
        <button
          onClick={() => {
            setSelectedInvoiceIdForEdit(null);
            setActivePage('gst-invoice');
          }}
          onMouseEnter={() => prefetchCache.prefetchPageData('gst-invoice', { customers, products, invoices })}
          onFocus={() => prefetchCache.prefetchPageData('gst-invoice', { customers, products, invoices })}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-normal text-xs shadow-soft transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>New Bill</span>
        </button>

        {/* Connectivity Status */}
        <div 
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors
            ${isOffline 
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800/30 dark:text-amber-400' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800/30 dark:text-emerald-400'
            }
          `}
          title={isOffline ? 'Using Local Storage' : 'Cloud Synchronized'}
        >
          {isOffline ? (
            <>
              <WifiOff className="h-3 w-3" />
              <span className="hidden md:inline font-medium">Offline</span>
            </>
          ) : (
            <>
              <Wifi className="h-3 w-3 animate-pulse" />
              <span className="hidden md:inline font-medium">Online</span>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5 text-amber-400" />}
        </button>

        {/* Business Profile Quick Badge */}
        <button 
          onClick={() => setActivePage('settings')}
          className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-left group"
        >
          <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
            {profile?.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="object-contain h-full w-full" />
            ) : (
              <Building className="h-4 w-4" />
            )}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-xs font-normal text-slate-900 dark:text-slate-100 line-clamp-1 max-w-[110px]">
              {profile?.business_name || 'My Business'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 max-w-[110px]">
              {profile?.gstin ? profile.gstin : 'Setup Profile'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
