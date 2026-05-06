/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit3, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { callDb, logAction } from '../lib/api';
import { cn } from '../lib/utils';

interface ProductSettingsProps {
  isDarkMode: boolean;
}

export const ProductSettings: React.FC<ProductSettingsProps> = ({ isDarkMode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'edit' | 'new'>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    nama_produk: '',
    harga_jual_retail: 0,
    harga_jual_grosir: 0,
    satuan: ''
  });

  // New State
  const [newForm, setNewForm] = useState({
    nama_produk: '',
    harga_jual_retail: 0,
    harga_jual_grosir: 0,
    satuan: 'dus'
  });

  const fetchProducts = async () => {
    setLoading(true);
    const data = await callDb("produk?select=*&order=nama_produk");
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSelectEdit = (id: string) => {
    const p = products.find(prod => String(prod.id) === id);
    if (p) {
      setSelectedProd(p);
      setEditForm({
        nama_produk: p.nama_produk,
        harga_jual_retail: Number(p.harga_jual_retail),
        harga_jual_grosir: Number(p.harga_jual_grosir || 0),
        satuan: p.satuan
      });
    } else {
      setSelectedProd(null);
    }
  };

  const normalizeName = (name: string) => name.trim().toLowerCase();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    setIsSubmitting(true);
    
    const res = await callDb(`produk?id=eq.${selectedProd.id}`, "PATCH", editForm);
    if (res) {
      await logAction("Update Produk", "Sukses", `Update data ${editForm.nama_produk}`, editForm);
      alert("Produk berhasil diperbarui!");
      fetchProducts();
    } else {
      alert("Gagal memperbarui produk.");
    }
    setIsSubmitting(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newForm.nama_produk.trim();
    const normName = normalizeName(cleanName);

    // Case-insensitive duplicate check
    const isDup = products.some(p => normalizeName(p.nama_produk) === normName);
    if (isDup) {
      alert("Error: Nama produk sudah ada!");
      return;
    }

    setIsSubmitting(true);
    const res = await callDb("produk", "POST", { ...newForm, nama_produk: cleanName });
    if (res) {
      await logAction("Tambah Produk", "Sukses", `Produk baru: ${cleanName}`, newForm);
      alert("Produk berhasil ditambahkan!");
      setNewForm({ nama_produk: '', harga_jual_retail: 0, harga_jual_grosir: 0, satuan: 'dus' });
      fetchProducts();
      setActiveTab('edit');
    } else {
      alert("Gagal menambahkan produk.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <h2 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">⚙️ Master Produk</h2>
        <div className="flex bg-white dark:bg-[#111827] p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors">
          <button 
            onClick={() => setActiveTab('edit')}
            className={cn("px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all", activeTab === 'edit' ? "bg-blue-600 text-white shadow-md" : "text-slate-400")}
          >
            Update Data
          </button>
          <button 
            onClick={() => setActiveTab('new')}
            className={cn("px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === 'new' ? "bg-blue-600 text-white shadow-md" : "text-slate-400")}
          >
            Tambah Baru
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {activeTab === 'edit' ? (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm space-y-5 transition-colors">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Pilih Nama Minuman (Geser untuk mencari)</label>
              <select 
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedProd?.id || ''}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 focus:ring-4 focus:ring-blue-500/10 text-sm font-bold outline-none transition-all"
              >
                <option value="" className="dark:bg-slate-900">-- Tekan di sini untuk memilih --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900">{p.nama_produk}</option>
                ))}
              </select>
            </div>

            {selectedProd && (
              <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-2 col-span-2">
                  <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Nama Minuman</label>
                  <input 
                    type="text" 
                    value={editForm.nama_produk}
                    onChange={(e) => setEditForm({...editForm, nama_produk: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-3.5 px-4 text-base font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Harga Rumah (Retail)</label>
                  <input 
                    type="number" 
                    value={editForm.harga_jual_retail || ''}
                    onChange={(e) => setEditForm({...editForm, harga_jual_retail: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-3.5 px-4 text-base font-bold tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Harga Jualan (Grosir)</label>
                  <input 
                    type="number" 
                    value={editForm.harga_jual_grosir || ''}
                    onChange={(e) => setEditForm({...editForm, harga_jual_grosir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-3.5 px-4 text-base font-bold tabular-nums"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Satuan (Contoh: Dus / Renteng)</label>
                  <input 
                    type="text" 
                    value={editForm.satuan}
                    onChange={(e) => setEditForm({...editForm, satuan: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl py-3.5 px-4 text-base font-bold uppercase tracking-widest"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="col-span-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 uppercase tracking-widest"
                >
                  {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "SIMPAN PERUBAHAN"}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm transition-colors">
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Nama Minuman Baru</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Aqua Gelas"
                  value={newForm.nama_produk}
                  onChange={(e) => setNewForm({...newForm, nama_produk: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 text-base font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Harga Rumah (Retail)</label>
                <input 
                  type="number" 
                  required
                  value={newForm.harga_jual_retail || ''}
                  onChange={(e) => setNewForm({...newForm, harga_jual_retail: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 text-base font-bold tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Harga Jualan (Grosir)</label>
                <input 
                  type="number" 
                  required
                  value={newForm.harga_jual_grosir || ''}
                  onChange={(e) => setNewForm({...newForm, harga_jual_grosir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 text-base font-bold tabular-nums"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[11px] uppercase font-black tracking-widest text-slate-400">Satuan (Contoh: Dus)</label>
                <input 
                  type="text" 
                  value={newForm.satuan}
                  onChange={(e) => setNewForm({...newForm, satuan: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-3.5 px-4 text-base font-bold uppercase tracking-widest"
                />
              </div>
              
              <div className="col-span-2 flex items-start gap-3 bg-blue-50 dark:bg-blue-500/10 p-4 rounded-xl border border-blue-100 dark:border-blue-500/20 text-blue-600">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Sistem akan mengecek apakah nama produk sudah tersedia untuk mencegah duplikat.</p>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="col-span-2 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/30 uppercase tracking-widest"
              >
                {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "TAMBAH PRODUK BARU"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
