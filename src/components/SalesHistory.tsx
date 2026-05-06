/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Printer, CheckCircle2, ChevronDown, ChevronUp, Receipt, Calendar, Filter } from 'lucide-react';
import { Sale } from '../types';
import { callDb, getNowWIB, logAction } from '../lib/api';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface SalesHistoryProps {
  isDarkMode: boolean;
}

export const SalesHistory: React.FC<SalesHistoryProps> = ({ isDarkMode }) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lunas' | 'Belum Lunas'>('Semua');
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  const fetchSales = async () => {
    setLoading(true);
    let query = `penjualan?select=*,item_penjualan(*,produk(nama_produk))&waktu_transaksi=gte.${dateRange.start}T00:00:00&waktu_transaksi=lte.${dateRange.end}T23:59:59&order=waktu_transaksi.desc`;
    
    if (statusFilter !== 'Semua') {
      query += `&status_pembayaran=eq.${statusFilter}`;
    }

    const data = await callDb(query);
    if (data) setSales(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSales();
    setPage(0);
  }, [dateRange, statusFilter]);

  const filteredSales = sales.filter(s => 
    (s.catatan || '').toLowerCase().includes(search.toLowerCase()) || 
    String(s.id).includes(search)
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  const handleLunasin = async (sale: Sale) => {
    if (sale.status_pembayaran === 'Lunas') return;
    
    const now = getNowWIB();
    const res = await callDb(`penjualan?id=eq.${sale.id}`, "PATCH", {
      status_pembayaran: 'Lunas',
      waktu_pelunasan: now
    });

    if (res) {
      await logAction("Lunasin Nota", "Sukses", `Nota #${sale.id} ditandai lunas`, { sale_id: sale.id, time: now });
      fetchSales();
      alert(`Nota #${sale.id} berhasil dilunasi!`);
    } else {
      alert("Gagal memperbarui status.");
    }
  };

  const handlePrint = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = sale.item_penjualan?.map(item => `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <div style="flex: 1;">
          <div style="font-weight: bold;">${item.produk?.nama_produk}</div>
          <div style="font-size: 10px;">${item.jumlah} x ${formatCurrency(item.harga_jual_satuan)}</div>
        </div>
        <div style="font-weight: bold;">${formatCurrency(item.subtotal_harga)}</div>
      </div>
    `).join('') || '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Nota #${sale.id}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 10px; 
              width: 80mm; 
              color: #000;
              font-size: 12px;
              line-height: 1.2;
            }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .footer { text-align: center; margin-top: 20px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
            .section { margin-bottom: 10px; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin: 0;">TOKO MINUMAN</h2>
            <div style="font-size: 10px;">Modern Beverage POS System</div>
          </div>
          
          <div class="section">
            <div class="flex"><span>Nota:</span> <span>#${sale.id}</span></div>
            <div class="flex"><span>Tanggal:</span> <span>${sale.waktu_transaksi.slice(0, 16).replace('T', ' ')}</span></div>
            <div class="flex"><span>Pelanggan:</span> <span>${sale.catatan || 'Umum'}</span></div>
          </div>

          <div class="divider"></div>

          <div class="section">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div class="section">
            <div class="flex bold">
              <span>TOTAL</span>
              <span>${formatCurrency(sale.total_harga)}</span>
            </div>
            <div class="flex">
              <span>Status</span>
              <span>${sale.status_pembayaran}</span>
            </div>
          </div>

          <div class="footer">
            <div>Terima Kasih Atas Kunjungan Anda</div>
            <div>Barang yang sudah dibeli tidak dapat ditukar</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">🧾 Riwayat Penjualan</h2>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#111827] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm group">
            <Calendar className="w-5 h-5 text-slate-400" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-400">DARI</span>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="bg-transparent outline-none cursor-pointer text-xs"
                />
              </div>
              <span className="text-slate-300">—</span>
              <div className="flex flex-col">
                <span className="text-[7px] text-slate-400">SAMPAI</span>
                <input 
                  type="date" 
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="bg-transparent outline-none cursor-pointer text-xs"
                />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#111827] p-2.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm group min-w-[140px]">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex flex-col flex-1">
              <span className="text-[7px] text-slate-400 font-black uppercase">STATUS BAYAR</span>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-900 dark:text-white outline-none text-xs font-black uppercase tracking-wider cursor-pointer w-full"
              >
                <option value="Semua" className="dark:bg-slate-900">Tampilkan Semua</option>
                <option value="Lunas" className="dark:bg-slate-900">Sudah Lunas</option>
                <option value="Belum Lunas" className="dark:bg-slate-900">Belum Lunas (Hutang)</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 md:flex-none md:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Nota atau Nama Pelanggan..." 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(0);}}
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-3 text-xs font-bold transition-all shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
              <tr>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">NOMOR NOTA</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">NAMA PELANGGAN</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">TANGGAL & WAKTU</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">STATUS BAYAR</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">TOTAL BAYAR</th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {paginatedSales.map(sale => (
                <React.Fragment key={sale.id}>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-2.5 text-[10px] font-black text-slate-400 tabular-nums">#{sale.id}</td>
                    <td className="px-4 py-2.5 font-bold text-xs uppercase tracking-tight text-slate-800 dark:text-white">{sale.catatan || 'Umum'}</td>
                    <td className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tabular-nums">
                      {sale.waktu_transaksi.slice(2, 10).replace(/-/g, '/')} {sale.waktu_transaksi.slice(11, 16)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest border",
                        sale.status_pembayaran === 'Lunas' 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" 
                          : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                      )}>
                        {sale.status_pembayaran === 'Lunas' ? 'SUDAH LUNAS' : 'BELUM LUNAS (HUTANG)'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-black text-blue-600 dark:text-blue-400 text-xs tabular-nums">{formatCurrency(sale.total_harga)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {sale.status_pembayaran === 'Belum Lunas' && (
                          <button 
                            onClick={() => handleLunasin(sale)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                            title="Lunasi"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button 
                          onClick={() => handlePrint(sale)}
                          className="p-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-900 hover:text-white dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white dark:hover:text-slate-900 transition-all"
                          title="Cetak"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                          className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 dark:bg-white/5 transition-all"
                        >
                          {expandedId === sale.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <AnimatePresence>
                    {expandedId === sale.id && (
                      <tr className="bg-slate-50/30 dark:bg-white/5">
                        <td colSpan={6} className="px-4 py-4">
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-2">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daftar Minuman yang Dibeli</p>
                                <div className="space-y-1">
                                  {sale.item_penjualan?.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-[10px] font-bold py-1 border-b border-slate-100 dark:border-white/5">
                                      <span className="text-slate-700 dark:text-slate-300 uppercase tracking-tight">{item.produk?.nama_produk}</span>
                                      <span className="text-slate-500 tabular-nums">{item.jumlah} x {formatCurrency(item.harga_jual_satuan)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex flex-col justify-end gap-3">
                                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Keuntungan Bersih (Laba)</span>
                                  <span className="text-lg font-black text-emerald-600 tabular-nums">{formatCurrency(sale.keuntungan_bersih)}</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSales.length === 0 && (
          <div className="p-16 text-center text-slate-300 dark:text-slate-800">
            <Receipt className="w-12 h-12 mx-auto mb-3 stroke-[1px]" />
            <p className="font-black uppercase tracking-[0.2em] text-[9px]">Kosong</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-[#111827] p-3 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors mt-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Halaman {page + 1} / {totalPages}</p>
            <div className="flex gap-1.5">
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-30 border border-slate-100 dark:border-transparent transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 disabled:opacity-30 border border-slate-100 dark:border-transparent transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
