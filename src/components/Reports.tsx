/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, Wallet, PackageOpen, Calendar } from 'lucide-react';
import { Sale } from '../types';
import { callDb } from '../lib/api';
import { cn, formatCurrency } from '../lib/utils';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface ReportsProps {
  isDarkMode: boolean;
}

export const Reports: React.FC<ReportsProps> = ({ isDarkMode }) => {
  const [salesData, setSalesData] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchReports = async () => {
    setLoading(true);
    const query = `penjualan?waktu_transaksi=gte.${dateRange.start}T00:00:00&waktu_transaksi=lte.${dateRange.end}T23:59:59&select=*,item_penjualan(*,produk(nama_produk))`;
    const data = await callDb(query);
    if (data) setSalesData(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const metrics = salesData.reduce((acc, sale) => {
    acc.gross += Number(sale.total_harga || 0);
    acc.modal += Number(sale.total_modal || 0);
    acc.net += Number(sale.keuntungan_bersih || 0);
    acc.count += 1;
    return acc;
  }, { gross: 0, modal: 0, net: 0, count: 0 });

  // Agregate daily revenue
  const dailyData = salesData.reduce((acc: any[], sale) => {
    const day = format(new Date(sale.waktu_transaksi), 'dd MMM');
    const existing = acc.find(d => d.day === day);
    const revenue = Number(sale.total_harga || 0);
    if (existing) {
      existing.revenue += revenue;
    } else {
      acc.push({ day, revenue });
    }
    return acc;
  }, []);

  // Sort daily data by date
  const sortedDailyData = dailyData.sort((a, b) => {
    return new Date(a.day).getTime() - new Date(b.day).getTime();
  });

  // Top Products
  const productData = salesData.reduce((acc: any, sale) => {
    sale.item_penjualan?.forEach(item => {
      const name = item.produk?.nama_produk || 'Unknown';
      acc[name] = (acc[name] || 0) + item.jumlah;
    });
    return acc;
  }, {});

  const topProducts = Object.entries(productData)
    .map(([name, qty]) => ({ name, qty: qty as number }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">📊 Laporan Keuangan</h2>
        <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm transition-colors group">
          <Calendar className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="bg-transparent outline-none cursor-pointer"
            />
            <span className="text-slate-300 dark:text-slate-600">—</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="bg-transparent outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Gross (Omzet)', value: metrics.gross, icon: Wallet, color: 'text-blue-600 dark:text-blue-500', shadow: 'shadow-blue-500/10', glow: 'bg-blue-500/10' },
          { label: 'Pokok (Modal)', value: metrics.modal, icon: ShoppingBag, color: 'text-slate-600 dark:text-slate-400', shadow: 'shadow-slate-500/10', glow: 'bg-slate-500/10' },
          { label: 'Laba Bersih', value: metrics.net, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-500', shadow: 'shadow-emerald-500/10', glow: 'bg-emerald-500/10' },
          { label: 'Total Transaksi', value: metrics.count, icon: PackageOpen, color: 'text-amber-600 dark:text-amber-500', shadow: 'shadow-amber-500/10', glow: 'bg-amber-500/10', isCurrency: false },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#1E293B] p-7 rounded-3xl border border-slate-200 dark:border-[#334155] relative overflow-hidden group hover:border-blue-500/50 transition-all shadow-sm hover:shadow-xl">
            <div className={cn("absolute right-[-20%] top-[-20%] w-32 h-32 rounded-full blur-[64px] opacity-30 dark:opacity-20", stat.glow)} />
            <div className="flex items-center gap-4 mb-5 relative z-10">
              <div className={cn("p-2.5 rounded-xl border border-slate-100 dark:border-white/5", stat.glow)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{stat.label}</span>
            </div>
            <p className={cn("text-3xl font-black tracking-tighter relative z-10", stat.color)}>
              {stat.isCurrency === false ? stat.value : formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1E293B] p-8 rounded-3xl border border-slate-200 dark:border-[#334155] space-y-8 shadow-sm transition-colors min-h-[500px] flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Pendapatan Harian</h3>
          <div className="flex-1 w-full min-h-[350px] relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%" key={`daily-${isDarkMode}`}>
                <LineChart data={sortedDailyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#f1f5f9"} vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `Rp${val/1000}k`}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                      border: '1px solid ' + (isDarkMode ? '#334155' : '#e2e8f0'),
                      borderRadius: '16px', 
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: isDarkMode ? '#ffffff' : '#0f172a'
                    }} 
                    itemStyle={{ color: '#3b82f6', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={5} 
                    dot={{ fill: '#3b82f6', strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }}
                    animationDuration={1000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1E293B] p-8 rounded-3xl border border-slate-200 dark:border-[#334155] space-y-8 shadow-sm transition-colors min-h-[500px] flex flex-col">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Produk Terlaris (Qty)</h3>
          <div className="flex-1 w-full min-h-[350px] relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%" key={`top-${isDarkMode}`}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20, right: 20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke={isDarkMode ? "#94a3b8" : "#64748b"} 
                    fontSize={10} 
                    width={120}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', 
                      border: '1px solid ' + (isDarkMode ? '#334155' : '#e2e8f0'),
                      borderRadius: '16px', 
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: isDarkMode ? '#ffffff' : '#0f172a'
                    }}
                    itemStyle={{ fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="qty" radius={[0, 8, 8, 0]} barSize={24} animationDuration={1000}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

