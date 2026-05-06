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
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase text-center xl:text-left w-full xl:w-auto">🧾 Riwayat Penjualan</h2>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-200 dark:border-[#334155] w-full md:w-auto shadow-sm transition-colors group">
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

          {/* Status Filter */}
          <div className="flex items-center gap-3 bg-white dark:bg-[#1E293B] p-3 rounded-2xl border border-slate-200 dark:border-[#334155] w-full md:w-auto shadow-sm transition-colors group">
            <Filter className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-slate-900 dark:text-white outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer w-full"
            >
              <option value="Semua" className="bg-white dark:bg-[#1E293B]">Semua Status</option>
              <option value="Lunas" className="bg-white dark:bg-[#1E293B]">Lunas</option>
              <option value="Belum Lunas" className="bg-white dark:bg-[#1E293B]">Belum Lunas</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari Nota / Catatan..." 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(0);}}
              className="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl py-3.5 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedSales.map(sale => (
          <div key={sale.id} className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-[#334155] overflow-hidden shadow-sm hover:shadow-xl transition-all">
            <div className="p-5 md:p-7 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Nota #{sale.id}</span>
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{sale.waktu_transaksi.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <p className="font-black text-xl text-slate-900 dark:text-white tracking-tight uppercase">{sale.catatan || 'Pelanggan Umum'}</p>
              </div>

              <div className="flex flex-wrap items-center gap-6 w-full md:w-auto">
                <div className={cn(
                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                  sale.status_pembayaran === 'Lunas' 
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" 
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30"
                )}>
                  {sale.status_pembayaran}
                </div>
                
                <span className="text-3xl font-black text-blue-600 dark:text-blue-500 tracking-tighter">{formatCurrency(sale.total_harga)}</span>

                <div className="flex items-center gap-3 ml-auto">
                  {sale.status_pembayaran === 'Belum Lunas' && (
                    <button 
                      onClick={() => handleLunasin(sale)}
                      className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 uppercase font-black text-[10px] tracking-widest"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Pelunasan
                    </button>
                  )}
                  <button 
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                    className="w-12 h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all flex items-center justify-center border border-slate-200 dark:border-transparent"
                  >
                    {expandedId === sale.id ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedId === sale.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 dark:bg-[#0F172A] border-t border-slate-100 dark:border-[#334155]"
                >
                  <div className="p-8 space-y-8">
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 pb-3 border-b border-slate-200 dark:border-white/5">
                        <div className="col-span-6">Detail Produk</div>
                        <div className="col-span-3 text-right">Kuantitas</div>
                        <div className="col-span-3 text-right">Subtotal</div>
                      </div>
                      {sale.item_penjualan?.map(item => (
                        <div key={item.id} className="grid grid-cols-12 py-2 items-center">
                          <div className="col-span-6 font-black text-xs uppercase text-slate-800 dark:text-white truncate">{item.produk?.nama_produk}</div>
                          <div className="col-span-3 text-right text-[10px] text-slate-500 font-black uppercase tracking-tighter">{item.jumlah} x {formatCurrency(item.harga_jual_satuan)}</div>
                          <div className="col-span-3 text-right font-black text-sm text-slate-900 dark:text-white leading-none">{formatCurrency(item.subtotal_harga)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-white/5">
                      <div className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                        <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-black tracking-widest mb-1 block">Pokok (Modal)</span>
                        <p className="font-black text-lg text-slate-600 dark:text-slate-400 tracking-tight">{formatCurrency(sale.total_modal)}</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                        <span className="text-[10px] uppercase text-emerald-600 dark:text-emerald-500 font-black tracking-widest mb-1 block">Keuntungan</span>
                        <p className="font-black text-lg text-emerald-600 dark:text-emerald-500 tracking-tight">{formatCurrency(sale.keuntungan_bersih)}</p>
                      </div>
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => handlePrint(sale)}
                          className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 dark:shadow-white/5"
                        >
                          <Printer className="w-5 h-5 font-bold" />
                          Cetak Struk
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {filteredSales.length === 0 && (
          <div className="p-32 text-center text-slate-300 dark:text-slate-700">
            <Receipt className="w-24 h-24 mx-auto mb-6 stroke-[1px]" />
            <p className="font-black uppercase tracking-[0.3em] text-xs">Riwayat nota tidak ditemukan</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-sm transition-colors">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Halaman {page + 1} / {totalPages}</p>
            <div className="flex gap-2">
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#334155] text-slate-600 dark:text-white disabled:opacity-30 border border-slate-200 dark:border-transparent transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-[#334155] text-slate-600 dark:text-white disabled:opacity-30 border border-slate-200 dark:border-transparent transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
