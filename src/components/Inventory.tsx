/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, PackagePlus, History, RefreshCw } from 'lucide-react';
import { Product, StockIn } from '../types';
import { callDb, getNowWIB, logAction } from '../lib/api';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryProps {
  isDarkMode: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({ isDarkMode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockHistory, setStockHistory] = useState<StockIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'tambah' | 'riwayat'>('status');
  
  // Pagination State
  const [prodPage, setProdPage] = useState(0);
  const [histPage, setHistPage] = useState(0);
  const itemsPerPage = 10;

  // Form State
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [qtyIn, setQtyIn] = useState(1);
  const [modalPrice, setModalPrice] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const prodData = await callDb("produk?select=*,stok_masuk(harga_modal_satuan,tanggal_masuk)&order=nama_produk");
    if (prodData) {
      const processed: Product[] = prodData.map((p: any) => {
        const sm = p.stok_masuk || [];
        const sortedSm = sm.sort((a: any, b: any) => new Date(b.tanggal_masuk).getTime() - new Date(a.tanggal_masuk).getTime());
        return {
          ...p,
          latest_modal: sortedSm.length > 0 ? parseFloat(sortedSm[0].harga_modal_satuan) : 0
        };
      });
      setProducts(processed);
    }

    const histData = await callDb("stok_masuk?select=*,produk(nama_produk)&order=tanggal_masuk.desc");
    if (histData) setStockHistory(histData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => p.nama_produk.toLowerCase().includes(search.toLowerCase()));
  const totalProdPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(prodPage * itemsPerPage, (prodPage + 1) * itemsPerPage);

  const totalHistPages = Math.ceil(stockHistory.length / itemsPerPage);
  const paginatedHistory = stockHistory.slice(histPage * itemsPerPage, (histPage + 1) * itemsPerPage);

  const handleSubmitStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd || qtyIn <= 0 || modalPrice <= 0) {
      alert("Mohon isi semua data dengan benar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const stockData = {
        produk_id: selectedProd.id,
        jumlah_masuk: qtyIn,
        harga_modal_satuan: modalPrice,
        keterangan: keterangan,
        tanggal_masuk: getNowWIB()
      };

      const res = await callDb("stok_masuk", "POST", stockData);
      if (res) {
        await callDb(`produk?id=eq.${selectedProd.id}`, "PATCH", {
          stok: selectedProd.stok + qtyIn
        });

        await logAction("Update Stok", "Sukses", `Tambah stok ${qtyIn} ${selectedProd.nama_produk}`, stockData);
        alert("Stok berhasil diperbarui!");
        setQtyIn(1);
        setKeterangan('');
        setSelectedProd(null);
        fetchData();
        setActiveTab('status');
      }
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui stok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockClass = (stok: number) => {
    if (stok <= 20) return "border-l-4 border-rose-500 shadow-[inset_4px_0_0_0_#EF4444]";
    if (stok <= 100) return "border-l-4 border-amber-500 shadow-[inset_4px_0_0_0_#F59E0B]";
    return "border-emerald-500/20";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">📦 Stok & Modal</h2>
        <div className="flex bg-white dark:bg-[#111827] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors">
          <button 
            onClick={() => setActiveTab('status')}
            className={cn("px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all", activeTab === 'status' ? "bg-blue-600 text-white shadow-md" : "text-slate-400")}
          >
            Lihat Stok
          </button>
          <button 
            onClick={() => setActiveTab('tambah')}
            className={cn("px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all", activeTab === 'tambah' ? "bg-blue-600 text-white shadow-md" : "text-slate-400")}
          >
            Tambah Stok
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={cn("px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all", activeTab === 'riwayat' ? "bg-blue-600 text-white shadow-md" : "text-slate-400")}
          >
            Riwayat Stok
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'status' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari Nama Minuman..." 
                value={search}
                onChange={(e) => {setSearch(e.target.value); setProdPage(0);}}
                className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-base font-bold shadow-sm"
              />
            </div>

            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">NAMA PRODUK</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">JUMLAH STOK</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">SATUAN</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">HARGA MODAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                    {paginatedProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-2.5">
                          <p className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-white line-clamp-1">{p.nama_produk}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-mono font-black tabular-nums shadow-sm",
                            p.stok <= 20 ? "bg-rose-500 text-white" : p.stok <= 100 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {p.stok}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.satuan}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs tabular-nums">{formatCurrency(p.latest_modal || 0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination Controls */}
            {totalProdPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-[#334155] transition-colors">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Halaman {prodPage + 1} / {totalProdPages}</p>
                <div className="flex gap-2">
                  <button 
                    disabled={prodPage === 0}
                    onClick={() => setProdPage(p => p - 1)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#334155] border border-slate-200 dark:border-transparent disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={prodPage >= totalProdPages - 1}
                    onClick={() => setProdPage(p => p + 1)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#334155] border border-slate-200 dark:border-transparent disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'tambah' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-4 transition-colors">
              <form onSubmit={handleSubmitStock} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Pilih Nama Minuman</label>
                  <select 
                    required
                    onChange={(e) => {
                      const p = products.find(prod => String(prod.id) === e.target.value);
                      setSelectedProd(p || null);
                      if (p) setModalPrice(p.latest_modal || 0);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 focus:ring-4 focus:ring-blue-500/10 text-sm font-bold outline-none transition-all"
                  >
                    <option value="" className="dark:bg-slate-900">-- Tekan di sini untuk memilih produk --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.nama_produk} (Stok: {p.stok})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Jumlah Masuk</label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      value={qtyIn || ''}
                      onChange={(e) => setQtyIn(e.target.value === '' ? 0 : parseInt(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 outline-none text-base font-bold tabular-nums"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Harga Modal Satuan</label>
                    <input 
                      type="number" 
                      min="1"
                      required
                      value={modalPrice || ''}
                      onChange={(e) => setModalPrice(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 outline-none text-base font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Keterangan (Contoh: Nama Sales)</label>
                  <input 
                    type="text" 
                    placeholder="Tulis keterangan di sini..."
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 outline-none text-sm font-bold"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/30 uppercase tracking-widest"
                >
                  {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "SIMPAN UPDATE STOK"}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'riwayat' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">TANGGAL & WAKTU</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">NAMA PRODUK</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">JUMLAH</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">HARGA MODAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {paginatedHistory.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tabular-nums">
                        {h.tanggal_masuk.slice(2, 10).replace(/-/g, '/')} {h.tanggal_masuk.slice(11, 16)}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white">{h.produk?.nama_produk}</td>
                      <td className={cn("px-4 py-2.5 text-right text-xs font-black tabular-nums", h.jumlah_masuk < 0 ? "text-rose-500" : "text-emerald-500")}>
                        {h.jumlah_masuk > 0 ? `+${h.jumlah_masuk}` : h.jumlah_masuk}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 tabular-nums">{formatCurrency(h.harga_modal_satuan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {paginatedHistory.length === 0 && (
                <div className="p-10 text-center text-slate-300 dark:text-slate-800 font-black uppercase tracking-widest text-[9px]">
                  Kosong
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalHistPages > 1 && (
              <div className="flex items-center justify-between bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-[#334155] transition-colors">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Halaman {histPage + 1} / {totalHistPages}</p>
                <div className="flex gap-2">
                  <button 
                    disabled={histPage === 0}
                    onClick={() => setHistPage(p => p - 1)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#334155] border border-slate-200 dark:border-transparent disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    disabled={histPage >= totalHistPages - 1}
                    onClick={() => setHistPage(p => p + 1)}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-[#334155] border border-slate-200 dark:border-transparent disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
