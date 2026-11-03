import React from 'react';

export type BankId = 
  | 'bdv'
  | 'bbva'
  | 'mercantil'
  | 'bnc'
  | 'tesoro'
  | 'banesco'
  | 'bancamiga'
  | 'bancaribe'
  | 'binance'
  | 'cash'
  | 'zinli'
  | 'wally'
  | 'generic_bank';

export interface BankLogoProps {
  name?: string;
  bankId?: BankId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

/**
 * Intelligent bank matcher based on account name
 */
export const getBankIdFromName = (name: string): BankId => {
  const n = (name || '').toLowerCase();
  if (n.includes('binance') || n.includes('usdt') || n.includes('cripto') || n.includes('crypto')) return 'binance';
  if (n.includes('venezuela') || n.includes('bdv')) return 'bdv';
  if (n.includes('provincial') || n.includes('bbva')) return 'bbva';
  if (n.includes('mercantil')) return 'mercantil';
  if (n.includes('bnc') || n.includes('nacional de credito') || n.includes('nacional de crédito')) return 'bnc';
  if (n.includes('tesoro')) return 'tesoro';
  if (n.includes('banesco')) return 'banesco';
  if (n.includes('bancamiga')) return 'bancamiga';
  if (n.includes('bancaribe')) return 'bancaribe';
  if (n.includes('efectivo') || n.includes('cash') || n.includes('billete')) return 'cash';
  if (n.includes('zinli')) return 'zinli';
  if (n.includes('wally')) return 'wally';
  return 'generic_bank';
};

// Exact user-provided official brand images
export const EXACT_BANK_LOGOS: Partial<Record<BankId, { src: string; fit: 'contain' | 'cover'; bg: string }>> = {
  bdv: { src: '/logos/bdv.png', fit: 'contain', bg: 'bg-white dark:bg-white border-slate-200 p-0.5' },
  binance: { src: '/logos/binance.png', fit: 'cover', bg: 'bg-black border-amber-500/30' },
  bnc: { src: '/logos/bnc.png', fit: 'contain', bg: 'bg-white dark:bg-white border-slate-200 p-0.5' },
  mercantil: { src: '/logos/mercantil.png', fit: 'cover', bg: 'bg-[#0070BA] border-blue-400/30' },
  bbva: { src: '/logos/provincial.jpg', fit: 'cover', bg: 'bg-[#001A9C] border-blue-500/30' },
  tesoro: { src: '/logos/tesoro.png', fit: 'contain', bg: 'bg-white dark:bg-white border-slate-200 p-0.5' },
};

export const BankLogo: React.FC<BankLogoProps> = ({
  name = '',
  bankId,
  size = 'md',
  className = '',
  showBadge = true
}) => {
  const resolvedId: BankId = bankId || getBankIdFromName(name);

  // Dimension mapping
  const sizeMap = {
    sm: { box: 'w-6 h-6', icon: 'w-4 h-4', text: 'text-[9px]' },
    md: { box: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-[11px]' },
    lg: { box: 'w-10 h-10', icon: 'w-6 h-6', text: 'text-xs' },
    xl: { box: 'w-12 h-12', icon: 'w-8 h-8', text: 'text-sm' },
  };

  const currentSize = sizeMap[size];
  const exactLogo = EXACT_BANK_LOGOS[resolvedId];

  // If user provided exact image logo
  if (exactLogo) {
    if (!showBadge) {
      return (
        <img 
          src={exactLogo.src} 
          alt={name || resolvedId} 
          className={`${currentSize.box} ${exactLogo.fit === 'cover' ? 'object-cover rounded-xl' : 'object-contain'} ${className}`}
        />
      );
    }

    return (
      <div 
        className={`inline-flex items-center justify-center shrink-0 rounded-2xl overflow-hidden border shadow-sm transition-transform ${currentSize.box} ${exactLogo.bg} ${className}`}
        title={name || resolvedId}
      >
        <img 
          src={exactLogo.src} 
          alt={name || resolvedId} 
          className={`w-full h-full ${exactLogo.fit === 'cover' ? 'object-cover' : 'object-contain'}`}
        />
      </div>
    );
  }

  // Vector graphics for other banks and fallbacks
  const renderLogo = () => {
    switch (resolvedId) {
      case 'tesoro':
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#7E122C" />
            <circle cx="50" cy="46" r="24" stroke="#F59E0B" strokeWidth="4" />
            <polygon points="50,28 64,48 36,48" fill="#F59E0B" />
            <rect x="46" y="44" width="8" height="14" fill="#F59E0B" rx="2" />
            <text 
              x="50" 
              y="79" 
              textAnchor="middle" 
              fill="#FDE68A" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="800" 
              fontSize="14" 
              letterSpacing="1"
            >
              TESORO
            </text>
          </svg>
        );

      case 'banesco':
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#FFFFFF" />
            <path d="M22 32 L46 54 L36 64 L12 42 Z" fill="#007934" />
            <path d="M42 32 L66 54 L56 64 L32 42 Z" fill="#005A9C" />
            <path d="M62 32 L86 54 L76 64 L52 42 Z" fill="#F58220" />
            <text 
              x="50" 
              y="82" 
              textAnchor="middle" 
              fill="#007934" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize="15" 
              letterSpacing="-0.5"
            >
              Banesco
            </text>
          </svg>
        );

      case 'bancamiga':
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#0F242E" />
            <g transform="translate(50, 48)">
              {[0, 60, 120, 180, 240, 300].map((deg) => (
                <rect 
                  key={deg} 
                  x="-3.5" 
                  y="-22" 
                  width="7" 
                  height="16" 
                  rx="3.5" 
                  fill="#00B4D8" 
                  transform={`rotate(${deg})`} 
                />
              ))}
              <circle cx="0" cy="0" r="6" fill="#FFFFFF" />
            </g>
            <text 
              x="50" 
              y="82" 
              textAnchor="middle" 
              fill="#00B4D8" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="800" 
              fontSize="12" 
              letterSpacing="0.5"
            >
              BANCAMIGA
            </text>
          </svg>
        );

      case 'bancaribe':
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#004F9F" />
            <path d="M25 32 C45 22 65 30 75 45 C65 52 45 42 25 55 Z" fill="#FF6A00" />
            <path d="M25 52 C45 42 65 50 75 65 C65 72 45 62 25 75 Z" fill="#FFFFFF" />
            <text 
              x="50" 
              y="88" 
              textAnchor="middle" 
              fill="#FFFFFF" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="800" 
              fontSize="11" 
              letterSpacing="0.5"
            >
              BANCARIBE
            </text>
          </svg>
        );

      case 'cash':
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="cashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#047857" />
                <stop offset="50%" stopColor="#059669" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="22" fill="url(#cashGrad)" />
            {/* Guilloche border and rosette corner circles */}
            <rect x="12" y="20" width="76" height="60" rx="8" stroke="#A7F3D0" strokeWidth="2.5" strokeDasharray="5 2.5" />
            <circle cx="20" cy="28" r="3" fill="#D1FAE5" />
            <circle cx="80" cy="28" r="3" fill="#D1FAE5" />
            <circle cx="20" cy="72" r="3" fill="#D1FAE5" />
            <circle cx="80" cy="72" r="3" fill="#D1FAE5" />
            {/* Center Oval & Currency Seal */}
            <ellipse cx="50" cy="50" rx="22" ry="19" fill="#065F46" stroke="#6EE7B7" strokeWidth="2" />
            <text 
              x="50" 
              y="61" 
              textAnchor="middle" 
              fill="#FFFFFF" 
              fontFamily="system-ui, -apple-system, sans-serif" 
              fontWeight="900" 
              fontSize="32"
            >
              $
            </text>
          </svg>
        );

      case 'zinli':
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#7C3AED" />
            <path d="M26 30 H74 L42 64 H74 V72 H26 L58 38 H26 Z" fill="#FFFFFF" />
          </svg>
        );

      case 'wally':
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#18181B" />
            <path d="M20 30 L35 70 L50 45 L65 70 L80 30" stroke="#10B981" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 100 100" className={`${currentSize.icon}`} fill="none">
            <rect width="100" height="100" rx="22" fill="#475569" />
            <polygon points="50,22 82,38 18,38" fill="#F8FAFC" />
            <rect x="24" y="42" width="8" height="28" fill="#F8FAFC" />
            <rect x="40" y="42" width="8" height="28" fill="#F8FAFC" />
            <rect x="56" y="42" width="8" height="28" fill="#F8FAFC" />
            <rect x="72" y="42" width="8" height="28" fill="#F8FAFC" />
            <rect x="16" y="72" width="68" height="8" rx="2" fill="#F8FAFC" />
          </svg>
        );
    }
  };

  if (!showBadge) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{renderLogo()}</div>;
  }

  const getBadgeBg = () => {
    switch (resolvedId) {
      case 'tesoro': return 'bg-amber-50 dark:bg-amber-950/40 border-amber-600/30 shadow-amber-600/10';
      case 'banesco': return 'bg-emerald-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700';
      case 'bancamiga': return 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500/30';
      case 'bancaribe': return 'bg-blue-50 dark:bg-blue-950/40 border-orange-500/30';
      case 'cash': return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/30 shadow-emerald-500/10';
      case 'zinli': return 'bg-purple-50 dark:bg-purple-950/40 border-purple-500/30';
      case 'wally': return 'bg-slate-900 border-emerald-500/30';
      default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center shrink-0 rounded-2xl overflow-hidden border shadow-sm transition-transform ${currentSize.box} ${getBadgeBg()} ${className}`}
      title={name || resolvedId}
    >
      {renderLogo()}
    </div>
  );
};
