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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">⚙️ Master Produk</h2>
        <div className="flex bg-white dark:bg-[#1E293B] p-1 rounded-xl border border-slate-200 dark:border-[#334155] shadow-sm transition-colors">
          <button 
            onClick={() => setActiveTab('edit')}
            className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'edit' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
          >
            Update Harga / Data
          </button>
          <button 
            onClick={() => setActiveTab('new')}
            className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === 'new' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
          >
            <PlusCircle className="w-4 h-4" /> Produk Baru
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {activeTab === 'edit' ? (
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-2xl dark:shadow-none space-y-8 transition-colors">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Pilih Produk untuk Diedit</label>
              <select 
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedProd?.id || ''}
                className="w-full h-16 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-2xl px-6 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-black text-slate-900 dark:text-white transition-all uppercase tracking-tight"
              >
                <option value="">-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-[#0F172A]">{p.nama_produk}</option>
                ))}
              </select>
            </div>

            {selectedProd && (
              <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Nama Produk</label>
                  <input 
                    type="text" 
                    value={editForm.nama_produk}
                    onChange={(e) => setEditForm({...editForm, nama_produk: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Harga Rumah (Retail)</label>
                  <input 
                    type="number" 
                    value={editForm.harga_jual_retail || ''}
                    onChange={(e) => setEditForm({...editForm, harga_jual_retail: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Harga Jualan (Grosir)</label>
                  <input 
                    type="number" 
                    value={editForm.harga_jual_grosir || ''}
                    onChange={(e) => setEditForm({...editForm, harga_jual_grosir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Satuan</label>
                  <input 
                    type="text" 
                    value={editForm.satuan}
                    onChange={(e) => setEditForm({...editForm, satuan: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-100 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white uppercase tracking-widest"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="col-span-2 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-600/30 uppercase tracking-widest"
                >
                  {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> SIMPAN PERUBAHAN</>}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1E293B] p-8 md:p-12 rounded-3xl border border-slate-200 dark:border-[#334155] shadow-2xl dark:shadow-none transition-colors">
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Nama Produk Baru</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ketik nama minuman..."
                  value={newForm.nama_produk}
                  onChange={(e) => setNewForm({...newForm, nama_produk: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-2xl h-14 px-6 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-900 dark:text-white transition-all shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Harga Rumah (Retail)</label>
                <input 
                  type="number" 
                  required
                  value={newForm.harga_jual_retail || ''}
                  onChange={(e) => setNewForm({...newForm, harga_jual_retail: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white shadow-inner transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Harga Jualan (Grosir)</label>
                <input 
                  type="number" 
                  required
                  value={newForm.harga_jual_grosir || ''}
                  onChange={(e) => setNewForm({...newForm, harga_jual_grosir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white shadow-inner transition-all"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Satuan</label>
                <input 
                  type="text" 
                  value={newForm.satuan}
                  onChange={(e) => setNewForm({...newForm, satuan: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl h-14 px-6 font-bold text-slate-900 dark:text-white uppercase tracking-widest shadow-inner transition-all"
                />
              </div>
              
              <div className="col-span-2 flex items-center gap-4 bg-blue-50 dark:bg-blue-500/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Sistem akan mengecek apakah nama produk sudah tersedia untuk mencegah duplikasi data.</p>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="col-span-2 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 uppercase tracking-[0.2em]"
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
