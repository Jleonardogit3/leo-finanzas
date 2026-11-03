import React, { useState } from 'react';
import { X, TrendingUp, Check, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PortfolioAsset, AssetType } from '../../types';

export const AssetModal: React.FC = () => {
  const { isAssetModalOpen, setIsAssetModalOpen, savePortfolioAsset } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState<AssetType>('crypto');
  const [quantity, setQuantity] = useState('1');
  const [costBasisUsd, setCostBasisUsd] = useState('');
  const [currentValuationUsd, setCurrentValuationUsd] = useState('');
  const [institution, setInstitution] = useState('');
  const [notes, setNotes] = useState('');

  if (!isAssetModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const valNum = parseFloat(currentValuationUsd) || 0;
    const costNum = parseFloat(costBasisUsd) || valNum;
    const qtyNum = parseFloat(quantity) || 1;

    const newAsset: PortfolioAsset = {
      id: `asset-${Date.now()}`,
      name: name.trim(),
      type,
      currency: 'USD',
      quantity: qtyNum,
      costBasisUsd: costNum,
      currentValuationUsd: valNum,
      institution: institution.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    savePortfolioAsset(newAsset);
    setIsAssetModalOpen(false);
    setName('');
    setCurrentValuationUsd('');
    setCostBasisUsd('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-500" />
              Agregar Activo o Inversión
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Registra cripto, acciones, inmuebles o capital de negocio
            </p>
          </div>
          <button 
            onClick={() => setIsAssetModalOpen(false)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Nombre del Activo
            </label>
            <input
              type="text"
              placeholder="Ej: Bitcoin (BTC), Acciones Mercantil, Local Comercial, Inventario..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Clase de Instrumento
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="crypto">Criptoactivo / Token</option>
                <option value="stock">Acciones / Fondos</option>
                <option value="business">Capital de Negocio</option>
                <option value="real_estate">Inmueble / Bien Raíz</option>
                <option value="vehicle">Vehículo</option>
                <option value="other">Otro Instrumento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Cantidad / Unidades
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Valuación Actual ($ USD)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={currentValuationUsd}
                onChange={(e) => setCurrentValuationUsd(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Costo de Compra ($ USD)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="Opcional"
                value={costBasisUsd}
                onChange={(e) => setCostBasisUsd(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Plataforma / Custodio (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Binance, Cold Wallet, BVC, Custodia Propia..."
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Activo en Portafolio</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
