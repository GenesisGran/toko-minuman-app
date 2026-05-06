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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">🛒 Kasir Penjualan</h2>
        <div className="flex bg-white dark:bg-[#1E293B] p-1.5 rounded-2xl border border-slate-200 dark:border-[#334155] shadow-lg shadow-slate-200/50 dark:shadow-none transition-all">
          <button 
            onClick={() => setPriceMode('Jualan')}
            className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", priceMode === 'Jualan' ? "bg-blue-600 text-white shadow-xl shadow-blue-500/40" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
          >
            JUALAN (Grosir)
          </button>
          <button 
            onClick={() => setPriceMode('Rumah')}
            className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all", priceMode === 'Rumah' ? "bg-blue-600 text-white shadow-xl shadow-blue-500/40" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
          >
            RUMAH (Retail)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.4fr] gap-8">
        {/* Product Selection */}
        <div className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari minuman..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-slate-900 dark:text-white placeholder:text-slate-400 font-bold transition-all shadow-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredProducts.map(p => {
                const hJual = priceMode === 'Jualan' ? (p.harga_jual_grosir || p.harga_jual_retail) : p.harga_jual_retail;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={p.id}
                    className={cn(
                      "bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-slate-200 dark:border-[#334155] cursor-pointer hover:border-blue-500 hover:shadow-2xl dark:hover:shadow-blue-500/10 hover:-translate-y-1.5 active:scale-[0.98] transition-all group",
                      getStockClass(p.stok)
                    )}
                    onClick={() => addToCart(p)}
                  >
                    <div className="flex flex-col h-full gap-4">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-xl tracking-tighter leading-tight text-slate-900 dark:text-white uppercase line-clamp-2">{p.nama_produk}</span>
                        <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 font-black tracking-widest uppercase border border-slate-200 dark:border-white/5">{p.satuan}</span>
                      </div>
                      <div className="mt-auto flex justify-between items-end">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em]">Stok: {p.stok}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-black text-2xl leading-none tabular-nums">{formatCurrency(Number(hJual))}</span>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm border border-blue-100 dark:border-blue-500/20">
                          <Plus className="w-7 h-7" />
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
        <div className="bg-white dark:bg-[#1E293B] rounded-3xl border border-slate-200 dark:border-[#334155] flex flex-col h-[calc(100vh-200px)] lg:h-auto overflow-hidden shadow-2xl dark:shadow-none">
          <div className="p-6 border-b border-slate-100 dark:border-[#334155] flex items-center justify-between">
            <h3 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter text-slate-900 dark:text-white">
              <ShoppingBasket className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              Keranjang
            </h3>
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-black text-slate-500 dark:text-slate-400 tracking-widest uppercase">
              {Object.keys(cart).length} PRODUK
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {Object.keys(cart).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 dark:text-slate-700 gap-4">
                <ShoppingBasket className="w-24 h-24 stroke-[1px]" />
                <p className="font-black uppercase tracking-widest text-xs">Keranjang masih kosong</p>
              </div>
            ) : (
              (Object.entries(cart) as [string, CartItem][]).map(([pid, item]) => (
                <div key={pid} className="bg-slate-50 dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-100 dark:border-[#334155] flex items-center gap-4 transition-colors">
                  <div className="flex-1">
                    <p className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{item.nama}</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{formatCurrency(item.harga_jual_satuan)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQty(pid, -1)}
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all text-slate-600 dark:text-white shadow-sm"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-black text-lg font-mono text-slate-900 dark:text-white">{item.jumlah}</span>
                    <button 
                      onClick={() => updateQty(pid, 1)}
                      className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all text-slate-600 dark:text-white shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => removeFromCart(pid)}
                      className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white flex items-center justify-center transition-all ml-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {Object.keys(cart).length > 0 && (
            <div className="p-6 bg-white dark:bg-[#0F172A] border-t border-slate-100 dark:border-[#334155] space-y-6">
              <div className="flex justify-between items-end">
                <span className="text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-[0.2em]">Total Tagihan</span>
                <span className="text-4xl font-black text-blue-600 dark:text-blue-500 leading-none tracking-tighter">{formatCurrency(totals.harga)}</span>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Nama Pelanggan / Meja..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#1E293B] border border-slate-100 dark:border-[#334155] rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-bold uppercase tracking-widest text-slate-900 dark:text-white"
                  />
                </div>
                
                <div className="flex bg-slate-50 dark:bg-[#1E293B] p-1 rounded-2xl border border-slate-100 dark:border-[#334155]">
                  <button 
                    onClick={() => setStatusBayar('Belum Lunas')}
                    className={cn("flex-1 py-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em]", statusBayar === 'Belum Lunas' ? "bg-rose-600 text-white shadow-xl shadow-rose-600/20" : "text-slate-400 hover:text-slate-600")}
                  >
                    Belum Lunas
                  </button>
                  <button 
                    onClick={() => setStatusBayar('Lunas')}
                    className={cn("flex-1 py-4 rounded-xl text-[10px] font-black transition-all uppercase tracking-[0.2em]", statusBayar === 'Lunas' ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20" : "text-slate-400 hover:text-slate-600")}
                  >
                    Lunas
                  </button>
                </div>

                <button 
                  disabled={isSaving}
                  onClick={handleSaveSale}
                  className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/40 uppercase tracking-widest"
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
