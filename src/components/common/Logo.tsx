import React from 'react';

interface LogoProps {
  variant?: 'full' | 'mark' | 'app-icon' | 'dark-bg';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  showTagline = false,
  className = ''
}) => {
  const dimensions = {
    sm: { mark: 'w-7.5 h-7.5', text: 'text-sm', tagline: 'text-[9px]', iconBox: 'w-9 h-9 rounded-xl p-1' },
    md: { mark: 'w-10 h-10', text: 'text-xl', tagline: 'text-[10px]', iconBox: 'w-12 h-12 rounded-2xl p-1.5' },
    lg: { mark: 'w-13.5 h-13.5', text: 'text-2xl', tagline: 'text-xs', iconBox: 'w-16 h-16 rounded-[22px] p-2' },
    xl: { mark: 'w-18 h-18', text: 'text-3xl', tagline: 'text-sm', iconBox: 'w-22 h-22 rounded-[26px] p-3' }
  }[size];

  // Meaningful Brand Logo Emblem for InvoiceFlow Billing:
  // Concept: Interlocking Infinity Flow Loop ('F') + Folded Invoice Sheet ('I') + Growth Arrow
  const LogoMarkSVG = (
    <svg 
      viewBox="0 0 120 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${dimensions.mark} transition-transform duration-300 group-hover:scale-105 flex-shrink-0 drop-shadow-md`}
    >
      <defs>
        {/* Primary Flow Gradient (Cyan to Electric Blue) */}
        <linearGradient id="flowLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>

        {/* Secondary Ribbon Gradient (Vibrant Blue to Indigo) */}
        <linearGradient id="ribbonArmGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>

        {/* Invoice Page Gradient */}
        <linearGradient id="invoicePageGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="100%" stopColor="#1C2B4B" />
        </linearGradient>

        <filter id="glowEffect" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563EB" floodOpacity="0.3"/>
        </filter>
      </defs>

      <g filter="url(#glowEffect)">
        {/* Folded Invoice Page Base ('I') */}
        <path 
          d="M26 18 C26 14.6863 28.6863 12 32 12 H56 C59.3137 12 62 14.6863 62 18 V94 C62 99.5228 57.5228 104 52 104 H32 C28.6863 104 26 101.314 26 98 V18 Z" 
          className="fill-[#0A1128] dark:fill-white transition-colors" 
        />

        {/* Invoice Document Detail Lines [ ≡ ] */}
        <rect x="34" y="24" width="20" height="3" rx="1.5" className="fill-blue-400 dark:fill-blue-600" />
        <rect x="34" y="32" width="20" height="3" rx="1.5" className="fill-blue-300 dark:fill-blue-400" />
        <rect x="34" y="40" width="14" height="3" rx="1.5" className="fill-blue-200 dark:fill-blue-300" />

        {/* Upper Fluid Flow Loop Arm ('F' top loop) */}
        <path 
          d="M50 12 H84 C97.2548 12 108 22.7452 108 36 C108 49.2548 97.2548 60 84 60 H66 C57.1634 60 50 52.8366 50 44 V12 Z" 
          fill="url(#flowLoopGrad)" 
        />

        {/* Lower Fluid Flow Loop Arm ('F' middle loop) */}
        <path 
          d="M50 48 H78 C87.9411 48 96 56.0589 96 66 C96 75.9411 87.9411 84 78 84 H50 V48 Z" 
          fill="url(#ribbonArmGrad)" 
        />

        {/* Upward Growth Flow Arrow Accent (↗) */}
        <path 
          d="M84 20 L102 20 L102 38 M102 20 L82 40" 
          stroke="#38BDF8" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Center Sparkle Dot */}
        <circle cx="84" cy="36" r="3" fill="#FFFFFF" />
      </g>
    </svg>
  );

  // App Icon Squircle Variant
  if (variant === 'app-icon') {
    return (
      <div className={`inline-flex items-center justify-center bg-white dark:bg-[#0A1128] rounded-2xl shadow-premium border border-slate-100 dark:border-slate-800 ${dimensions.iconBox} group ${className}`}>
        {LogoMarkSVG}
      </div>
    );
  }

  // Dark Background Container Variant
  if (variant === 'dark-bg') {
    return (
      <div className={`inline-flex items-center gap-3 p-3.5 rounded-2xl bg-[#0A1128] text-white shadow-premium ${className}`}>
        {LogoMarkSVG}
        <div className="flex flex-col justify-center">
          <div className={`font-bold tracking-tight ${dimensions.text} flex items-center leading-none text-white`}>
            <span>invoiceflow</span>
            <span className="text-[#38BDF8] font-bold">-billing</span>
          </div>
          {showTagline && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-1 font-medium tracking-wide">
              <span className="h-[1px] w-3 bg-blue-500/50" />
              <span>Smart Invoicing. Smooth Payments.</span>
              <span className="h-[1px] w-3 bg-blue-500/50" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center group ${className}`}>
        {LogoMarkSVG}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {LogoMarkSVG}

      <div className="flex flex-col justify-center min-w-0">
        <div className={`font-bold tracking-tight ${dimensions.text} flex items-center leading-none whitespace-nowrap`}>
          <span className="text-[#0A1128] dark:text-white">invoiceflow</span>
          <span className="text-blue-600 dark:text-blue-400 font-bold">-billing</span>
        </div>
        
        {showTagline && (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium text-[9.5px] mt-1 tracking-wide whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>Smart Invoicing. Smooth Payments.</span>
          </div>
        )}
      </div>
    </div>
  );
};
