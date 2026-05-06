/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit3, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { callDb, logAction } from '../lib/api';
import { cn } from '../lib/utils';

export const ProductSettings: React.FC = () => {
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
        <h2 className="text-3xl font-bold tracking-tight">⚙️ Master Produk</h2>
        <div className="flex bg-[#1E293B] p-1 rounded-xl border border-[#334155]">
          <button 
            onClick={() => setActiveTab('edit')}
            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'edit' ? "bg-blue-600 text-white" : "text-slate-400")}
          >
            Update Harga / Data
          </button>
          <button 
            onClick={() => setActiveTab('new')}
            className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2", activeTab === 'new' ? "bg-blue-600 text-white" : "text-slate-400")}
          >
            <PlusCircle className="w-4 h-4" /> Produk Baru
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {activeTab === 'edit' ? (
          <div className="bg-[#1E293B] p-8 rounded-2xl border border-[#334155] shadow-2xl space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Produk untuk Diedit</label>
              <select 
                onChange={(e) => handleSelectEdit(e.target.value)}
                value={selectedProd?.id || ''}
                className="w-full h-14 bg-[#0F172A] border border-[#334155] rounded-xl px-6 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              >
                <option value="">-- Pilih Produk --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.nama_produk}</option>
                ))}
              </select>
            </div>

            {selectedProd && (
              <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Nama Produk</label>
                  <input 
                    type="text" 
                    value={editForm.nama_produk}
                    onChange={(e) => setEditForm({...editForm, nama_produk: e.target.value})}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4 shadow-inner"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Harga Rumah (Retail)</label>
                  <input 
                    type="number" 
                    value={editForm.harga_jual_retail || ''}
                    onChange={(e) => setEditForm({...editForm, harga_jual_retail: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Harga Jualan (Grosir)</label>
                  <input 
                    type="number" 
                    value={editForm.harga_jual_grosir || ''}
                    onChange={(e) => setEditForm({...editForm, harga_jual_grosir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Satuan</label>
                  <input 
                    type="text" 
                    value={editForm.satuan}
                    onChange={(e) => setEditForm({...editForm, satuan: e.target.value})}
                    className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="col-span-2 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20"
                >
                  {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> SIMPAN PERUBAHAN</>}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="bg-[#1E293B] p-8 rounded-2xl border border-[#334155] shadow-2xl">
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Nama Produk Baru</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ketik nama minuman..."
                  value={newForm.nama_produk}
                  onChange={(e) => setNewForm({...newForm, nama_produk: e.target.value})}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Harga Rumah (Retail)</label>
                <input 
                  type="number" 
                  required
                  value={newForm.harga_jual_retail || ''}
                  onChange={(e) => setNewForm({...newForm, harga_jual_retail: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Harga Jualan (Grosir)</label>
                <input 
                  type="number" 
                  required
                  value={newForm.harga_jual_grosir || ''}
                  onChange={(e) => setNewForm({...newForm, harga_jual_grosir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Satuan</label>
                <input 
                  type="text" 
                  value={newForm.satuan}
                  onChange={(e) => setNewForm({...newForm, satuan: e.target.value})}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-xl h-12 px-4"
                />
              </div>
              
              <div className="col-span-2 flex items-center gap-3 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-blue-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-xs font-medium">Sistem akan mengecek apakah nama produk sudah tersedia untuk mencegah duplikasi data.</p>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="col-span-2 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20"
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
