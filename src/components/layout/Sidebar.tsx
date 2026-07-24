import React from 'react';
import { useApp, ActivePage } from '../../context/AppContext';
import { prefetchCache } from '../../services/prefetchCache';
import { Logo } from '../common/Logo';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  FileText, 
  Users, 
  Package, 
  History, 
  BarChart3, 
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const { activePage, setActivePage, setSelectedInvoiceIdForEdit, customers, products, invoices } = useApp();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'gst-invoice', name: 'Create GST Invoice', icon: FileSpreadsheet },
    { id: 'nongst-invoice', name: 'Create Non-GST Invoice', icon: FileText },
    { id: 'invoice-history', name: 'Invoice History', icon: History },
    { id: 'customers', name: 'Customers', icon: Users },
    { id: 'products', name: 'Products', icon: Package },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: SettingsIcon },
  ];

  const handleHover = (pageId: string) => {
    prefetchCache.prefetchPageData(pageId, { customers, products, invoices });
  };

  const handleNavigate = (page: ActivePage) => {
    setSelectedInvoiceIdForEdit(null);
    setActivePage(page);
    setMobileOpen(false);
  };

  const sidebarWidth = collapsed ? 'w-20' : 'w-64';

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden no-print"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-all duration-300 ease-in-out no-print
          ${sidebarWidth} 
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center overflow-hidden">
            {collapsed ? (
              <Logo variant="mark" size="md" />
            ) : (
              <Logo variant="full" size="md" />
            )}
          </div>
          
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Close button (mobile drawer) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-grow py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id as ActivePage)}
                onMouseEnter={() => handleHover(item.id)}
                onFocus={() => handleHover(item.id)}
                className={`flex items-center w-full rounded-2xl transition-all duration-200 group px-3.5 py-3
                  ${isActive 
                    ? 'bg-blue-600 text-white font-normal shadow-soft shadow-blue-500/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                  }
                  ${collapsed ? 'justify-center py-3.5 px-0' : 'gap-3.5'}
                `}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110
                  ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}
                `} />
                {!collapsed && <span className="text-xs font-normal whitespace-nowrap">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer info (only when expanded) */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="flex flex-col gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              <span className="font-medium text-slate-700 dark:text-slate-300">invoiceflow-billing</span>
              <span>Smart Invoicing. Smooth Payments.</span>
            </div>
          </div>
        )}
      </aside>

      {/* Floating Bottom Mobile Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5 flex items-center justify-around no-print shadow-premium">
        <button
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activePage === 'dashboard' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          onClick={() => handleNavigate('invoice-history')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activePage === 'invoice-history' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <History className="h-5 w-5" />
          <span className="text-[10px]">Invoices</span>
        </button>

        {/* Center Primary Action: Create Invoice */}
        <button
          onClick={() => handleNavigate('gst-invoice')}
          className="flex flex-col items-center justify-center -mt-5 h-12 w-12 rounded-2xl bg-blue-600 text-white shadow-card shadow-blue-600/30 active:scale-95 transition-all"
          aria-label="Create GST Invoice"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>

        <button
          onClick={() => handleNavigate('products')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activePage === 'products' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
        >
          <Package className="h-5 w-5" />
          <span className="text-[10px]">Products</span>
        </button>

        <button
          onClick={() => setMobileOpen(true)}
          className="flex flex-col items-center gap-1 p-2 rounded-xl text-slate-500 dark:text-slate-400"
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </>
  );
};
