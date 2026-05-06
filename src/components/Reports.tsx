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

export const Reports: React.FC = () => {
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
        <h2 className="text-3xl font-bold tracking-tight">📊 Laporan Keuangan</h2>
        <div className="flex items-center gap-2 bg-[#1E293B] p-2 rounded-xl border border-[#334155]">
          <Calendar className="w-4 h-4 text-slate-500" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="bg-transparent text-white outline-none"
            />
            <span className="text-slate-600">—</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="bg-transparent text-white outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Gross (Omzet)', value: metrics.gross, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Pokok (Modal)', value: metrics.modal, icon: ShoppingBag, color: 'text-slate-400', bg: 'bg-slate-500/10' },
          { label: 'Laba Bersih', value: metrics.net, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total Transaksi', value: metrics.count, icon: PackageOpen, color: 'text-amber-500', bg: 'bg-amber-500/10', isCurrency: false },
        ].map((stat, i) => (
          <div key={i} className="bg-[#1E293B] p-6 rounded-2xl border border-[#334155] relative overflow-hidden group hover:border-slate-500 transition-colors">
            <div className={cn("absolute right-[-10%] top-[-10%] w-24 h-24 rounded-full blur-3xl opacity-20", stat.bg)} />
            <div className="flex items-center gap-4 mb-4">
              <div className={cn("p-2 rounded-lg", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</span>
            </div>
            <p className={cn("text-2xl font-black", stat.color)}>
              {stat.isCurrency === false ? stat.value : formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-[#1E293B] p-6 rounded-2xl border border-[#334155] space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Pendapatan Harian</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedDailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `Rp${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} 
                  itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1E293B] p-6 rounded-2xl border border-[#334155] space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Produk Terlaris (Qty)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#475569" 
                  fontSize={10} 
                  width={100}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} 
                />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
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
  );
};
