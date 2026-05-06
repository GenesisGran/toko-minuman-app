/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: number;
  nama_produk: string;
  satuan: string;
  harga_jual_retail: number;
  harga_jual_grosir: number | null;
  stok: number;
  created_at?: string;
  latest_modal?: number;
}

export interface StockIn {
  id: number;
  produk_id: number;
  jumlah_masuk: number;
  harga_modal_satuan: number;
  tanggal_masuk: string;
  keterangan: string | null;
  produk?: {
    nama_produk: string;
  };
}

export interface SaleItem {
  id?: number;
  penjualan_id?: number;
  produk_id: number;
  jumlah: number;
  harga_jual_satuan: number;
  harga_modal_satuan: number;
  subtotal_harga: number;
  subtotal_modal: number;
  produk?: {
    nama_produk: string;
  };
}

export interface Sale {
  id: number;
  waktu_transaksi: string;
  total_harga: number;
  total_modal: number;
  keuntungan_bersih: number;
  status_pembayaran: 'Lunas' | 'Belum Lunas';
  catatan: string | null;
  waktu_pelunasan: string | null;
  item_penjualan?: SaleItem[];
}

export interface AppLog {
  id?: number;
  created_at?: string;
  action: string;
  status: string;
  message: string;
  details: any;
}
