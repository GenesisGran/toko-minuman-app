/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingCart, Package, Settings, Receipt, BarChart3, RefreshCw, Sun, Moon } from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  setActivePage: (page: string) => void;
  isOnline: boolean;
  onRefresh: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activePage, setActivePage, isOnline, onRefresh }) => {
  const menuItems = [
    { id: 'kasir', label: '🛒 Kasir', icon: ShoppingCart },
    { id: 'stok', label: '📦 Stok & Modal', icon: Package },
    { id: 'produk', label: '⚙️ Atur Produk', icon: Settings },
    { id: 'riwayat', label: '🧾 Riwayat Nota', icon: Receipt },
    { id: 'laporan', label: '📊 Laporan', icon: BarChart3 },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0B0F1A] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar - Compact and sleek */}
      <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-white/5 sticky top-0 h-screen transition-colors duration-300 shadow-sm dark:shadow-none">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]")} />
            <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {isOnline ? "Terhubung" : "Terputus"}
            </span>
          </div>
          <h1 className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">🥤 SUMBER JAYA</h1>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 border",
                activePage === item.id 
                  ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border-transparent"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2 mb-2">
          <button 
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 dark:bg-white/10 hover:bg-slate-800 dark:hover:bg-white/15 text-white rounded-xl transition-all font-black text-[9px] uppercase tracking-[0.2em] shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Segarkan
          </button>
        </div>
      </aside>

      {/* Mobile Nav - Bottom fixed bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#111827] border-t border-slate-200 dark:border-white/5 flex justify-around py-1.5 px-2 transition-colors">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
              activePage === item.id ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10" : "text-slate-400"
            )}
          >
            <item.icon className="w-5 h-5 font-bold" />
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">{item.label.split(' ')[1]}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto custom-scrollbar">
        <header className="lg:hidden bg-white dark:bg-[#111827] p-4 flex justify-between items-center border-b border-slate-200 dark:border-white/5 sticky top-0 z-40 transition-colors">
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase">🥤 SUMBER JAYA</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-rose-500")} />
              <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {isOnline ? "Terhubung" : "Terputus"}
              </span>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
