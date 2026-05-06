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

export const SalesHistory: React.FC = () => {
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
        <h2 className="text-3xl font-bold tracking-tight">🧾 Riwayat Penjualan</h2>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-[#1E293B] p-2 rounded-xl border border-[#334155] w-full md:w-auto">
            <Calendar className="w-4 h-4 text-slate-500" />
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
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

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-[#1E293B] p-2 rounded-xl border border-[#334155] w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-transparent text-white outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer"
            >
              <option value="Semua" className="bg-[#1E293B]">Semua Status</option>
              <option value="Lunas" className="bg-[#1E293B]">Lunas</option>
              <option value="Belum Lunas" className="bg-[#1E293B]">Belum Lunas</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Cari Nota / Catatan..." 
              value={search}
              onChange={(e) => {setSearch(e.target.value); setPage(0);}}
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {paginatedSales.map(sale => (
          <div key={sale.id} className="bg-[#1E293B] rounded-2xl border border-[#334155] overflow-hidden">
            <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">Nota #{sale.id}</span>
                  <span className="text-xs font-mono text-slate-500">{sale.waktu_transaksi.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <p className="font-bold text-lg">{sale.catatan || 'Pelanggan Umum'}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  sale.status_pembayaran === 'Lunas' ? "bg-emerald-600/20 text-emerald-500 border border-emerald-500/30" : "bg-rose-600/20 text-rose-500 border border-rose-500/30"
                )}>
                  {sale.status_pembayaran}
                </div>
                
                <span className="text-xl font-black text-blue-500">{formatCurrency(sale.total_harga)}</span>

                <div className="flex items-center gap-2 ml-auto">
                  {sale.status_pembayaran === 'Belum Lunas' && (
                    <button 
                      onClick={() => handleLunasin(sale)}
                      className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 px-4 shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-tight">Lunasin</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-all"
                  >
                    {expandedId === sale.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                  className="bg-[#0F172A] border-t border-[#334155]"
                >
                  <div className="p-6 space-y-6">
                    <div className="space-y-3">
                      <div className="grid grid-cols-12 text-[10px] uppercase font-black tracking-widest text-slate-500 pb-2 border-b border-white/5">
                        <div className="col-span-6">Produk</div>
                        <div className="col-span-3 text-right">Qty</div>
                        <div className="col-span-3 text-right">Total</div>
                      </div>
                      {sale.item_penjualan?.map(item => (
                        <div key={item.id} className="grid grid-cols-12 py-1 items-center">
                          <div className="col-span-6 font-bold truncate text-sm">{item.produk?.nama_produk}</div>
                          <div className="col-span-3 text-right text-xs text-slate-400 font-mono">{item.jumlah} x {formatCurrency(item.harga_jual_satuan)}</div>
                          <div className="col-span-3 text-right font-black text-sm">{formatCurrency(item.subtotal_harga)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Pokok (Modal)</span>
                        <p className="font-bold text-slate-400">{formatCurrency(sale.total_modal)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">Keuntungan</span>
                        <p className="font-bold text-emerald-500">{formatCurrency(sale.keuntungan_bersih)}</p>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={() => handlePrint(sale)}
                          className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-slate-200 transition-all text-sm uppercase tracking-widest shadow-xl shadow-white/5"
                        >
                          <Printer className="w-4 h-4" />
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
          <div className="p-20 text-center text-slate-500">
            <Receipt className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">Riwayat nota tidak ditemukan</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-[#1E293B] p-4 rounded-xl border border-[#334155]">
            <p className="text-xs text-slate-400 font-bold uppercase">Halaman {page + 1} dari {totalPages}</p>
            <div className="flex gap-2">
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="p-2 rounded-lg bg-[#334155] disabled:opacity-30 hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="p-2 rounded-lg bg-[#334155] disabled:opacity-30 hover:bg-slate-600 transition-colors"
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
