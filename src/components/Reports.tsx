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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">📊 Laporan & Keuntungan</h2>
        <div className="flex items-center gap-3 bg-white dark:bg-[#111827] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors group">
          <Calendar className="w-5 h-5 text-slate-400" />
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
            <div className="flex flex-col">
              <span className="text-[7px] text-slate-400">DARI TANGGAL</span>
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="bg-transparent outline-none cursor-pointer text-xs"
              />
            </div>
            <span className="text-slate-300 mt-2">—</span>
            <div className="flex flex-col">
              <span className="text-[7px] text-slate-400">SAMPAI TANGGAL</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="bg-transparent outline-none cursor-pointer text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL PENJUALAN', value: metrics.gross, icon: Wallet, color: 'text-blue-600', glow: 'bg-blue-500/5' },
          { label: 'MODAL TERPAKAI', value: metrics.modal, icon: ShoppingBag, color: 'text-slate-500', glow: 'bg-slate-500/5' },
          { label: 'KEUNTUNGAN BERSIH', value: metrics.net, icon: TrendingUp, color: 'text-emerald-600', glow: 'bg-emerald-500/5' },
          { label: 'JUMLAH NOTA', value: metrics.count, icon: PackageOpen, color: 'text-amber-600', glow: 'bg-amber-500/5', isCurrency: false },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-white/5 relative overflow-hidden group shadow-sm">
            <div className={cn("absolute right-[-10%] top-[-10%] w-24 h-24 rounded-full blur-[40px] opacity-20", stat.glow)} />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <stat.icon className={cn("w-4 h-4", stat.color)} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
            </div>
            <p className={cn("text-2xl font-black tracking-tighter relative z-10 tabular-nums", stat.color)}>
              {stat.isCurrency === false ? stat.value : formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-white/5 h-[320px] flex flex-col shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Grafik Penjualan Harian</h3>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%" key={`daily-${isDarkMode}`}>
              <LineChart data={sortedDailyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#ffffff08" : "#00000008"} vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} dy={5} />
                <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '8px', fontSize: '10px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 3 }} animationDuration={500} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-white/5 h-[320px] flex flex-col shadow-sm">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Produk Paling Laku (Jumlah Terjual)</h3>
          <div className="flex-1 w-full min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%" key={`top-${isDarkMode}`}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: -10, right: 10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={8} width={80} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]} barSize={12}>
                  {topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

