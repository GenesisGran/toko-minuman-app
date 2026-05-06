/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, X, ShoppingBasket, Save, RefreshCw } from 'lucide-react';
import { Product, SaleItem } from '../types';
import { callDb, getNowWIB, logAction } from '../lib/api';
import { cn, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem extends SaleItem {
  nama: string;
}

interface KasirProps {
  isDarkMode: boolean;
}

export const Kasir: React.FC<KasirProps> = ({ isDarkMode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priceMode, setPriceMode] = useState<'Jualan' | 'Rumah'>('Jualan');
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [catatan, setCatatan] = useState('');
  const [statusBayar, setStatusBayar] = useState<'Belum Lunas' | 'Lunas'>('Belum Lunas');
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    // Fetch products with their latest modal from stock_masuk
    const query = "produk?select=*,stok_masuk(harga_modal_satuan,tanggal_masuk)&order=nama_produk";
    const data = await callDb(query);
    if (data) {
      const processed: Product[] = data.map((p: any) => {
        const sm = p.stok_masuk || [];
        const sortedSm = sm.sort((a: any, b: any) => new Date(b.tanggal_masuk).getTime() - new Date(a.tanggal_masuk).getTime());
        return {
          ...p,
          latest_modal: sortedSm.length > 0 ? parseFloat(sortedSm[0].harga_modal_satuan) : 0
        };
      });
      setProducts(processed);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!search) return products;
    return products.filter(p => p.nama_produk.toLowerCase().includes(search.toLowerCase()));
  }, [search, products]);

  const addToCart = (p: Product) => {
    if (p.stok <= 0) {
      alert("Stok habis!");
      return;
    }

    const currentInCart = cart[String(p.id)]?.jumlah || 0;
    if (currentInCart >= p.stok) {
      alert("Jumlah di keranjang sudah mencapai batas stok!");
      return;
    }

    const hJual = priceMode === 'Jualan' ? (p.harga_jual_grosir || p.harga_jual_retail) : p.harga_jual_retail;
    const pid = String(p.id);
    
    setCart(prev => {
      const existing = prev[pid];
      if (existing) {
        return {
          ...prev,
          [pid]: { ...existing, jumlah: existing.jumlah + 1 }
        };
      }
      return {
        ...prev,
        [pid]: {
          produk_id: p.id,
          nama: p.nama_produk,
          harga_jual_satuan: Number(hJual),
          harga_modal_satuan: p.latest_modal || 0,
          jumlah: 1,
          subtotal_harga: Number(hJual),
          subtotal_modal: p.latest_modal || 0
        }
      };
    });
  };

  const updateQty = (pid: string, delta: number) => {
    const item = cart[pid];
    if (!item) return;

    if (delta > 0) {
      const product = products.find(p => String(p.id) === pid);
      if (product && item.jumlah >= product.stok) {
        alert("Stok tidak mencukupi!");
        return;
      }
    }

    setCart(prev => {
      const currentItem = prev[pid];
      if (!currentItem) return prev;
      const newQty = currentItem.jumlah + delta;
      if (newQty <= 0) {
        const { [pid]: _, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [pid]: { ...currentItem, jumlah: newQty }
      };
    });
  };

  const removeFromCart = (pid: string) => {
    setCart(prev => {
      const { [pid]: _, ...rest } = prev;
      return rest;
    });
  };

  const totals = useMemo(() => {
    return Object.values(cart).reduce((acc: { harga: number; modal: number }, item: CartItem) => {
      acc.harga += item.harga_jual_satuan * item.jumlah;
      acc.modal += item.harga_modal_satuan * item.jumlah;
      return acc;
    }, { harga: 0, modal: 0 });
  }, [cart]);

  const handleSaveSale = async () => {
    if (Object.keys(cart).length === 0) return;
    setIsSaving(true);
    
    try {
      // 0. Double check stock levels globally before saving
      const productIds = Object.keys(cart);
      const latestStockRes = await callDb(`produk?id=in.(${productIds.join(',')})`);
      
      if (latestStockRes) {
        for (const item of Object.values(cart) as CartItem[]) {
          const dbProd = latestStockRes.find((p: any) => p.id === item.produk_id);
          if (!dbProd || dbProd.stok < item.jumlah) {
            alert(`Gagal: Stok ${item.nama} tidak mencukupi (Tersisa: ${dbProd?.stok || 0})`);
            setIsSaving(false);
            fetchProducts(); // Refresh stock
            return;
          }
        }
      }

      const saleData = {
        total_harga: totals.harga,
        total_modal: totals.modal,
        keuntungan_bersih: totals.harga - totals.modal,
        status_pembayaran: statusBayar,
        catatan: catatan,
        waktu_transaksi: getNowWIB(),
        waktu_pelunasan: statusBayar === "Lunas" ? getNowWIB() : null
      };

      const resSale = await callDb("penjualan", "POST", saleData);
      
      if (resSale && resSale.length > 0) {
        const saleId = resSale[0].id;
        
        for (const item of Object.values(cart) as CartItem[]) {
          // 1. Add Sale Item
          await callDb("item_penjualan", "POST", {
            penjualan_id: saleId,
            produk_id: item.produk_id,
            jumlah: item.jumlah,
            harga_jual_satuan: item.harga_jual_satuan,
            harga_modal_satuan: item.harga_modal_satuan,
            subtotal_harga: item.harga_jual_satuan * item.jumlah,
            subtotal_modal: item.harga_modal_satuan * item.jumlah
          });

          // 2. Add Stock Out (Logged as negative stock_masuk)
          await callDb("stok_masuk", "POST", {
            produk_id: item.produk_id,
            jumlah_masuk: -item.jumlah,
            harga_modal_satuan: item.harga_modal_satuan,
            keterangan: `Penjualan #${saleId}`,
            tanggal_masuk: getNowWIB()
          });

          // 3. Update Product Stock (Atomic decrement is better, but here we do it based on fetched latest values)
          const dbProd = latestStockRes.find((p: any) => p.id === item.produk_id);
          await callDb(`produk?id=eq.${item.produk_id}`, "PATCH", {
            stok: dbProd.stok - item.jumlah
          });
        }

        await logAction("Simpan Penjualan", "Sukses", `Nota #${saleId} berhasil disimpan`, saleData);
        setCart({});
        setCatatan('');
        fetchProducts();
        alert("Nota berhasil disimpan!");
      } else {
        throw new Error("Gagal menyimpan header penjualan");
      }
    } catch (error) {
      console.error(error);
      await logAction("Simpan Penjualan", "Gagal", String(error));
      alert("Gagal menyimpan nota.");
    } finally {
      setIsSaving(false);
    }
  };

  const getStockClass = (stok: number) => {
    if (stok <= 20) return "border-l-4 border-rose-500 shadow-[inset_4px_0_0_0_#EF4444]";
    if (stok <= 100) return "border-l-4 border-amber-500 shadow-[inset_4px_0_0_0_#F59E0B]";
    return "border-l-4 border-emerald-500 shadow-[inset_4px_0_0_0_#10B981]";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">🛒 Kasir</h2>
        <div className="flex bg-white dark:bg-[#111827] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-all">
          <button 
            onClick={() => setPriceMode('Rumah')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black transition-all uppercase",
              priceMode === 'Rumah' 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
            )}
          >
            HARGA RUMAH (RETAIL)
          </button>
          <button 
            onClick={() => setPriceMode('Jualan')}
            className={cn(
              "px-5 py-2.5 rounded-lg text-xs font-black transition-all uppercase",
              priceMode === 'Jualan' 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600"
            )}
          >
            HARGA JUALAN (GROSIR)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1.2fr] gap-4">
        {/* Product Selection */}
        <div className="space-y-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari Nama Minuman..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-base placeholder:text-slate-400 font-bold transition-all"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredProducts.map(p => {
                const hJual = priceMode === 'Jualan' ? (p.harga_jual_grosir || p.harga_jual_retail) : p.harga_jual_retail;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    key={p.id}
                    className={cn(
                      "bg-white dark:bg-[#111827] p-3.5 rounded-2xl border border-slate-200 dark:border-white/5 cursor-pointer hover:border-blue-500 hover:shadow-lg dark:hover:shadow-blue-500/10 active:scale-[0.98] transition-all group relative overflow-hidden",
                      getStockClass(p.stok)
                    )}
                    onClick={() => addToCart(p)}
                  >
                    <div className="flex flex-col h-full gap-2 relative z-10">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-xs tracking-tight leading-tight text-slate-800 dark:text-white uppercase line-clamp-2">{p.nama_produk}</span>
                        <span className="text-[7px] bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-black tracking-widest uppercase border border-slate-200 dark:border-white/5 shrink-0">{p.satuan}</span>
                      </div>
                      <div className="mt-auto pt-2 border-t border-slate-50 dark:border-white/5 flex justify-between items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Ada {p.stok}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-black text-base tabular-nums">{formatCurrency(Number(hJual))}</span>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100 dark:border-blue-500/10">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Cart */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-white/5 flex flex-col h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)] overflow-hidden shadow-sm sticky top-4">
          <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
            <h3 className="text-sm font-black flex items-center gap-2 uppercase tracking-tight text-slate-900 dark:text-white">
              <ShoppingBasket className="w-4 h-4 text-blue-600" />
              Keranjang
            </h3>
            <span className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full text-[9px] font-black text-slate-500 tracking-widest uppercase">
              {Object.keys(cart).length} PRODUK
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {Object.keys(cart).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-800 gap-3">
                <ShoppingBasket className="w-16 h-16 stroke-[1px]" />
                <p className="font-black uppercase tracking-[0.2em] text-[8px]">Keranjang Kosong</p>
              </div>
            ) : (
              (Object.entries(cart) as [string, CartItem][]).map(([pid, item]) => (
                <div key={pid} className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 flex items-center gap-3 group transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[11px] uppercase tracking-tight text-slate-800 dark:text-white truncate">{item.nama}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{formatCurrency(item.harga_jual_satuan)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg p-0.5">
                      <button 
                        onClick={() => updateQty(pid, -1)}
                        className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-all text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-black text-xs font-mono text-slate-900 dark:text-white">{item.jumlah}</span>
                      <button 
                        onClick={() => updateQty(pid, 1)}
                        className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-all text-slate-400 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(pid)}
                      className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {Object.keys(cart).length > 0 && (
            <div className="p-5 bg-slate-50 dark:bg-[#111827] border-t border-slate-200 dark:border-white/10 space-y-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-baseline">
                <span className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Total Bayar</span>
                <span className="text-4xl font-black text-blue-600 dark:text-blue-500 tracking-tighter tabular-nums">{formatCurrency(totals.harga)}</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest px-1">Nama Pelanggan / Catatan</label>
                  <input 
                    type="text" 
                    placeholder="Tulis nama pelanggan di sini..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold shadow-sm"
                  />
                </div>
                
                <div className="flex bg-white dark:bg-white/5 p-1.5 rounded-xl border border-slate-200 dark:border-white/10">
                  <button 
                    onClick={() => setStatusBayar('Belum Lunas')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-xs font-black transition-all uppercase tracking-widest", 
                      statusBayar === 'Belum Lunas' ? "bg-rose-600 text-white shadow-lg shadow-rose-500/20" : "text-slate-400"
                    )}
                  >
                    BELUM LUNAS (HUTANG)
                  </button>
                  <button 
                    onClick={() => setStatusBayar('Lunas')}
                    className={cn(
                      "flex-1 py-3 rounded-lg text-xs font-black transition-all uppercase tracking-widest", 
                      statusBayar === 'Lunas' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400"
                    )}
                  >
                    SUDAH LUNAS
                  </button>
                </div>

                <button 
                  disabled={isSaving}
                  onClick={handleSaveSale}
                  className="w-full py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 uppercase tracking-widest"
                >
                  {isSaving ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-6 h-6" />
                      SIMPAN TRANSAKSI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
