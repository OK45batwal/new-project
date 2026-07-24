import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { BusinessProfile } from '../types';
import { api } from '../services/api';
import { prefetchCache } from '../services/prefetchCache';
import { INDIAN_STATES } from '../utils/gstEngine';
import { Save, Building, CreditCard, Shield, Download, UploadCloud, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  const { gstProfile, nongstProfile, updateProfile, showToast, customers, products, invoices } = useApp();
  const [editingProfileType, setEditingProfileType] = useState<'GST' | 'Non-GST'>('GST');
  const activeProfile = editingProfileType === 'GST' ? gstProfile : nongstProfile;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedLogoInfo, setStagedLogoInfo] = useState<{ name: string; sizeKb: number } | null>(null);

  const [formData, setFormData] = useState<BusinessProfile>({
    business_name: '',
    logo_url: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    gstin: '',
    pan: '',
    email: '',
    website: '',
    phone: '',
    alt_phone: '',
    bank_name: '',
    branch: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    qr_code_url: ''
  });

  const [activeSubTab, setActiveSubTab] = useState<'business' | 'bank' | 'backup'>('business');

  // Load profile values
  useEffect(() => {
    setStagedLogoInfo(null);
    if (activeProfile) {
      setFormData(activeProfile);
    } else {
      setFormData({
        business_name: '',
        logo_url: '',
        address: '',
        city: '',
        state: 'Maharashtra',
        state_code: '27',
        gstin: '',
        pan: '',
        email: '',
        website: '',
        phone: '',
        alt_phone: '',
        bank_name: '',
        branch: '',
        account_number: '',
        ifsc_code: '',
        upi_id: '',
        qr_code_url: ''
      });
    }
  }, [activeProfile, editingProfileType]);

  // Early File Execution: Process, validate & stage logo as soon as file is chosen
  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, SVG, WebP)', 'danger');
      return;
    }

    try {
      showToast('Processing logo image in background...', 'info');
      const { dataUrl, sizeKb } = await prefetchCache.stageLogoAsset(file);
      setFormData(prev => ({ ...prev, logo_url: dataUrl }));
      setStagedLogoInfo({ name: file.name, sizeKb });
      showToast(`Logo processed & staged successfully (${sizeKb} KB)!`, 'success');
    } catch (err: any) {
      showToast('Failed to process image file.', 'danger');
    }
  };

  // Handle state change & update state code
  const handleStateChange = (stateName: string) => {
    const matchedState = INDIAN_STATES.find(s => s.name === stateName);
    setFormData(prev => ({
      ...prev,
      state: stateName,
      state_code: matchedState ? matchedState.code : ''
    }));
  };

  const handleFieldChange = (field: keyof BusinessProfile, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_name || !formData.phone || !formData.address) {
      showToast('Business name, phone and address are required.', 'danger');
      return;
    }
    await updateProfile(editingProfileType, formData);
  };

  // Backup data
  const handleBackup = () => {
    try {
      const backupData = {
        profile_gst: gstProfile,
        profile_nongst: nongstProfile,
        customers: customers,
        products: products,
        invoices: invoices
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `invoiceflow_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      showToast('Database backup downloaded successfully!', 'success');
    } catch (e: any) {
      showToast(e.message, 'danger');
    }
  };

  // Restore data
  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        showToast('Restoring database...', 'info');
        await api.restoreDatabase(parsed);
        
        showToast('Database restored successfully! Reloading page...', 'success');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        showToast(err.message || 'Invalid backup file format or restoration failed.', 'danger');
      }
    };
    fileReader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-soft space-y-1">
          <button
            onClick={() => setActiveSubTab('business')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5
              ${activeSubTab === 'business' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' 
                : 'text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }
            `}
          >
            <Building className="h-4.5 w-4.5" />
            <span>Business Profile</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('bank')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5
              ${activeSubTab === 'bank' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' 
                : 'text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }
            `}
          >
            <CreditCard className="h-4.5 w-4.5" />
            <span>Bank & UPI Credentials</span>
          </button>

          <button
            onClick={() => setActiveSubTab('backup')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5
              ${activeSubTab === 'backup' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' 
                : 'text-text-secondary hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
              }
            `}
          >
            <Shield className="h-4.5 w-4.5" />
            <span>Database Backup</span>
          </button>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-soft">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            
            {/* 1. Business Profile section */}
            {activeSubTab === 'business' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-50 dark:border-slate-850 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary dark:text-slate-200">Seller Business Profile</h3>
                    <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Configure your business billing credentials.</p>
                  </div>
                  
                  {/* GST vs Non-GST Profile Selector */}
                  <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setEditingProfileType('GST')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                        ${editingProfileType === 'GST'
                          ? 'bg-white dark:bg-slate-700 text-primary dark:text-slate-200 shadow-soft'
                          : 'text-text-secondary dark:text-slate-400 hover:text-text-primary'
                        }
                      `}
                    >
                      GST Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProfileType('Non-GST')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all
                        ${editingProfileType === 'Non-GST'
                          ? 'bg-white dark:bg-slate-700 text-primary dark:text-slate-200 shadow-soft'
                          : 'text-text-secondary dark:text-slate-400 hover:text-text-primary'
                        }
                      `}
                    >
                      Non-GST Profile
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.business_name}
                      onChange={(e) => handleFieldChange('business_name', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-medium text-text-secondary uppercase tracking-wider">Business Logo</label>
                      {stagedLogoInfo && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Staged & Ready ({stagedLogoInfo.sizeKb} KB)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://... or upload file"
                        value={formData.logo_url}
                        onChange={(e) => handleFieldChange('logo_url', e.target.value)}
                        className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleLogoFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-10 px-3 flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-text-secondary dark:text-slate-300 text-xs font-normal transition-colors whitespace-nowrap"
                        title="Early execution file upload — processes and stages logo immediately"
                      >
                        <UploadCloud className="h-4 w-4" />
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>
                  {editingProfileType === 'GST' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">GSTIN Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 27AAAAA0000A1Z5"
                          value={formData.gstin || ''}
                          onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
                          maxLength={15}
                          className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">PAN Number</label>
                        <input
                          type="text"
                          placeholder="e.g. ABCDE1234F"
                          value={formData.pan || ''}
                          onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase())}
                          maxLength={10}
                          className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Alt Mobile Number</label>
                    <input
                      type="tel"
                      value={formData.alt_phone}
                      onChange={(e) => handleFieldChange('alt_phone', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Website Domain</label>
                    <input
                      type="text"
                      placeholder="www.yourbusiness.com"
                      value={formData.website}
                      onChange={(e) => handleFieldChange('website', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Business Billing Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">State *</label>
                    <select
                      value={formData.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      {INDIAN_STATES.map(s => (
                        <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">State Code</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.state_code}
                      className="w-full h-10 px-3.5 text-sm border border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-800 rounded-xl text-text-secondary font-bold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Bank & UPI Credentials section */}
            {activeSubTab === 'bank' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary dark:text-slate-200">Bank & UPI Payment Credentials</h3>
                  <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Specify your banking credentials so buyers can settle invoices directly via IMPS, NEFT, or UPI QR code scan.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bank_name || ''}
                      onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Branch Name</label>
                    <input
                      type="text"
                      value={formData.branch || ''}
                      onChange={(e) => handleFieldChange('branch', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">Account Number</label>
                    <input
                      type="text"
                      value={formData.account_number || ''}
                      onChange={(e) => handleFieldChange('account_number', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SBIN0001234"
                      value={formData.ifsc_code || ''}
                      onChange={(e) => handleFieldChange('ifsc_code', e.target.value.toUpperCase())}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">UPI ID (VPA)</label>
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi"
                      value={formData.upi_id || ''}
                      onChange={(e) => handleFieldChange('upi_id', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1.5">UPI QR Code Image URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.qr_code_url || ''}
                      onChange={(e) => handleFieldChange('qr_code_url', e.target.value)}
                      className="w-full h-10 px-3.5 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-text-primary dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 3. Backup and restore section */}
            {activeSubTab === 'backup' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-text-primary dark:text-slate-200">Offline database configuration</h3>
                  <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">Export your local storage database details into a backup JSON file, or restore it onto another device.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50 dark:border-slate-850">
                  <div className="p-5 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-text-primary dark:text-slate-200">Back Up Ledger</h4>
                      <p className="text-[10px] text-text-secondary dark:text-slate-400">Download customer lists, product catalogs, settings, and local draft invoices as a single file.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleBackup}
                      className="h-10 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 w-full transition-colors"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download Backup JSON</span>
                    </button>
                  </div>

                  <div className="p-5 border border-slate-100 dark:border-slate-800/80 rounded-2xl space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-text-primary dark:text-slate-200">Restore Ledger</h4>
                      <p className="text-[10px] text-text-secondary dark:text-slate-400">Upload a previously saved InvoiceFlow backup file to overwrite your local storage database state.</p>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleRestore}
                        id="restore-upload"
                        className="hidden"
                      />
                      <label
                        htmlFor="restore-upload"
                        className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center justify-center gap-1.5 w-full cursor-pointer transition-colors shadow-soft"
                      >
                        <UploadCloud className="h-4 w-4" />
                        <span>Upload & Restore</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Buttons for settings forms */}
            {activeSubTab !== 'backup' && (
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-50 dark:border-slate-850">
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs shadow-soft transition-colors flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
