import React from 'react';
import { 
  PieChart as PieIcon, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Building, 
  Briefcase, 
  Car, 
  Trash2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AssetType } from '../../types';

export const PortfolioView: React.FC = () => {
  const { 
    portfolioAssets, 
    totalLiquidUsd, 
    totalLiquidVes, 
    rates, 
    setIsAssetModalOpen, 
    deletePortfolioAsset 
  } = useApp();

  const totalInvestedUsd = portfolioAssets.reduce((sum, a) => sum + a.currentValuationUsd, 0);
  const totalCostUsd = portfolioAssets.reduce((sum, a) => sum + (a.costBasisUsd || a.currentValuationUsd), 0);
  const totalGainUsd = totalInvestedUsd - totalCostUsd;
  const totalGainPercent = totalCostUsd > 0 ? (totalGainUsd / totalCostUsd) * 100 : 0;

  const vesInUsd = rates.usdt > 0 ? totalLiquidVes / rates.usdt : 0;
  const grandTotalPatrimonioUsd = totalLiquidUsd + vesInUsd + totalInvestedUsd;

  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'crypto': return <Coins className="w-5 h-5 text-amber-500" />;
      case 'stock': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'business': return <Briefcase className="w-5 h-5 text-emerald-500" />;
      case 'real_estate': return <Building className="w-5 h-5 text-purple-500" />;
      case 'vehicle': return <Car className="w-5 h-5 text-rose-500" />;
      default: return <PieIcon className="w-5 h-5 text-slate-500" />;
    }
  };

  const getAssetTypeLabel = (type: AssetType) => {
    switch (type) {
      case 'crypto': return 'Cripto / Web3';
      case 'stock': return 'Acciones / Renta';
      case 'business': return 'Negocio / Capital';
      case 'real_estate': return 'Bienes Raíces';
      case 'vehicle': return 'Vehículo';
      default: return 'Otro Activo';
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-6 h-6 text-emerald-500" />
            Portafolio & Activos
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Estructura patrimonial, liquidez e instrumentos de inversión
          </p>
        </div>

        <button
          onClick={() => setIsAssetModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 flex items-center gap-1.5 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Agregar Activo / Inversión</span>
        </button>
      </div>

      {/* Patrimonial High Level Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Total General Card */}
        <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Patrimonio Total Estimado
            </span>
            <div className="text-2xl sm:text-3xl font-black mt-1">
              ${grandTotalPatrimonioUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-400">Liquidez + Inversiones</span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-300 flex justify-between">
            <span>En Bolívares (ref USDT):</span>
            <span className="font-bold">
              {(grandTotalPatrimonioUsd * rates.usdt).toLocaleString('es-VE', { maximumFractionDigits: 0 })} Bs
            </span>
          </div>
        </div>

        {/* Liquidez Inmediata Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Liquidez Inmediata
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ${(totalLiquidUsd + vesInUsd).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">Bancos, Efectivo y Binance</span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">${totalLiquidUsd.toFixed(2)} Divisas</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">${vesInUsd.toFixed(2)} en Bs</span>
          </div>
        </div>

        {/* Activos e Inversiones Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Instrumentos Invertidos
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              ${totalInvestedUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400">{portfolioAssets.length} activos registrados</span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Rendimiento:</span>
            <span className={`font-black flex items-center gap-0.5 ${totalGainUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {totalGainUsd >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {totalGainUsd >= 0 ? '+' : ''}${totalGainUsd.toFixed(2)} ({totalGainPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

      </div>

      {/* Extensible Assets List */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Instrumentos y Activos de Inversión
          </h3>
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Escalable para Cripto, Inmuebles o Capital de Negocio
          </span>
        </div>

        {portfolioAssets.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <PieIcon className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              No has añadido activos o inversiones todavía.
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-0.5">
              Registra posiciones en Bitcoin, inventario de negocio, acciones de la BVC o bienes inmuebles para auditar tu patrimonio integral.
            </p>
            <button
              onClick={() => setIsAssetModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md"
            >
              + Agregar Primer Activo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {portfolioAssets.map(asset => {
              const gain = asset.currentValuationUsd - (asset.costBasisUsd || asset.currentValuationUsd);
              const gainPct = asset.costBasisUsd > 0 ? (gain / asset.costBasisUsd) * 100 : 0;

              return (
                <div 
                  key={asset.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750">
                          {getAssetIcon(asset.type)}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                            {asset.name}
                          </h4>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400">
                            {getAssetTypeLabel(asset.type)} {asset.institution ? `• ${asset.institution}` : ''}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deletePortfolioAsset(asset.id)}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Eliminar activo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="text-lg font-black text-slate-900 dark:text-white">
                        ${asset.currentValuationUsd.toLocaleString('es-VE', { minimumFractionDigits: 2 })} USD
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        Cant: {asset.quantity} {asset.costBasisUsd ? `• Costo: $${asset.costBasisUsd.toFixed(2)}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">Ganancia/Pérdida:</span>
                    <span className={`font-bold text-xs flex items-center gap-0.5 ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {gain >= 0 ? '+' : ''}${gain.toFixed(2)} ({gainPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
