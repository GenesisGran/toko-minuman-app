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
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-white transition-colors duration-300">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-[#334155] sticky top-0 h-screen transition-colors duration-300 shadow-xl dark:shadow-none">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-3 h-3 rounded-full", isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
            <span className={cn("text-[10px] font-black uppercase tracking-widest", isOnline ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500")}>
              {isOnline ? "TERHUBUNG" : "TERPUTUS"}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">🥤 Sumber Jaya</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 border",
                activePage === item.id 
                  ? "bg-blue-600/10 text-blue-600 border-blue-500/50 dark:bg-blue-600/20 dark:text-blue-400" 
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border-transparent"
              )}
            >
              <item.icon className="w-5 h-5 font-bold" />
              <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto space-y-2">
          <button 
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 dark:bg-[#334155] hover:bg-blue-700 dark:hover:bg-[#475569] text-white rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 dark:shadow-none"
          >
            <RefreshCw className="w-4 h-4" />
            Segarkan Data
          </button>
        </div>
      </aside>

      {/* Mobile Nav - Bottom fixed bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-[#334155] flex justify-around p-2 transition-colors">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              activePage === item.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
            )}
          >
            <item.icon className="w-5 h-5 font-bold" />
            <span className="text-[9px] font-black uppercase tracking-widest">{item.label.split(' ')[1]}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto">
        <header className="lg:hidden bg-white dark:bg-[#1E293B] p-4 flex justify-between items-center border-b border-slate-200 dark:border-[#334155] transition-colors">
          <h1 className="text-lg font-black tracking-tighter text-slate-900 dark:text-white uppercase">🥤 Sumber Jaya</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-rose-500")} />
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
