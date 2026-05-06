/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingCart, Package, Settings, Receipt, BarChart3, RefreshCw, Smartphone, Monitor } from 'lucide-react';
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
    <div className="flex min-h-screen bg-[#0F172A] text-white">
      {/* Sidebar - Hidden on mobile, shown on desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#1E293B] border-r border-[#334155] sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-3 h-3 rounded-full", isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
            <span className={cn("text-xs font-bold uppercase tracking-wider", isOnline ? "text-emerald-500" : "text-rose-500")}>
              {isOnline ? "TERHUBUNG" : "TERPUTUS"}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">🥤 Sumber Jaya</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200",
                activePage === item.id 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/50" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button 
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#334155] hover:bg-[#475569] text-white rounded-xl transition-colors font-semibold text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Segarkan Data
          </button>
        </div>
      </aside>

      {/* Mobile Nav - Bottom fixed bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1E293B] border-t border-[#334155] flex justify-around p-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              activePage === item.id ? "text-blue-400" : "text-slate-400"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] uppercase font-bold">{item.label.split(' ')[1]}</span>
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 pb-20 lg:pb-0 overflow-y-auto">
        <header className="lg:hidden bg-[#1E293B] p-4 flex justify-between items-center border-bottom border-[#334155]">
          <h1 className="text-lg font-bold">🥤 Sumber Jaya</h1>
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-rose-500")} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </header>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
