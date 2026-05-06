import streamlit as st
import httpx
import pandas as pd
import logging, json, os
from datetime import datetime, date, timedelta, timezone

# --- 1. CONFIG & STYLES ---
st.set_page_config(page_title="Toko Sumber Jaya POS", layout="wide")

# Custom CSS for Responsive Mobile View & Technical Theme
st.markdown("""
    <style>
    /* Dark Theme Base */
    [data-testid="stAppViewContainer"] { 
        background-color: #0F172A; 
    }
    .main .block-container {
        padding-top: 3rem !important;
        padding-bottom: 3rem !important;
    }
    
    /* Responsive Columns: Stack vertically on small screens */
    [data-testid="column"] {
        min-width: 300px !important;
        width: 100% !important;
        margin-bottom: 1rem;
    }
    @media (min-width: 1024px) {
        [data-testid="column"] {
            min-width: 0 !important;
            width: auto !important;
        }
    }

    /* Input & UI Elements */
    .stTextInput input, .stNumberInput input, .stSelectbox div[data-baseweb="select"] { 
        background-color: #1E293B !important; color: white !important; border: 1px solid #334155 !important;
        border-radius: 12px !important;
    }
    
    /* Technical Badges & Cards */
    .badge { padding: 4px 12px; border-radius: 8px; font-weight: 800; font-size: 11px; text-transform: uppercase; }
    .bg-lunas { background-color: #10B981; color: white; border: 1px solid #059669; }
    .bg-belum { background-color: #EF4444; color: white; border: 1px solid #DC2626; }
    .conn-status { font-size: 14px; font-weight: bold; margin-bottom: 10px; }
    .p-card { 
        padding: 15px; border-radius: 12px; border: 1px solid #334155; margin-bottom: 10px; background-color: #1E293B;
        transition: all 0.2s ease;
    }
    
    /* Stock Color Indicators (SSOT) */
    .stok-low { border-left: 6px solid #EF4444 !important; }    /* Merah <= 20 */
    .stok-mid { border-left: 6px solid #F59E0B !important; }    /* Kuning 21-100 */
    .stok-high { border-left: 6px solid #10B981 !important; }   /* Hijau > 100 */

    /* Touch Friendly Buttons (44px min-height) */
    .stButton>button {
        height: 44px !important;
        min-width: 44px !important;
        border-radius: 12px !important;
        font-weight: bold !important;
        transition: all 0.2s ease !important;
    }
    .stButton>button:active {
        transform: scale(0.95);
    }
    .cart-qty { display:flex; align-items:center; justify-content:center; height:44px; font-size:18px; font-weight:bold; font-family: monospace; }
    </style>
""", unsafe_allow_html=True)

# --- 2. DATABASE UTILITIES ---
SUPABASE_URL = "https://eycwwbgymeuggayeifce.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3d3Ymd5bWV1Z2dheWVpZmNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDExNzIsImV4cCI6MjA5MTcxNzE3Mn0.X4s3QAE5sVP8ee6DRCLY6Xpf6AKZBX5MIBcWBTP65oI"

def call_db(endpoint: str, method="GET", data=None, params=None):
    headers = {
        "apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json", "Accept-Profile": "toko", "Content-Profile": "toko",
        "Prefer": "return=representation" if method in ["POST", "PATCH"] else ""
    }
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    try:
        with httpx.Client(timeout=5.0) as client:
            if method == "GET": resp = client.get(url, headers=headers, params=params)
            elif method == "POST": resp = client.post(url, headers=headers, json=data)
            elif method == "PATCH": resp = client.patch(url, headers=headers, json=data)
            elif method == "DELETE": resp = client.delete(url, headers=headers, params=params)
            
            if resp.status_code in [200, 201]: return resp.json()
            elif resp.status_code == 204: return True
            return None
    except Exception:
        return None

def log_action(action, status, message="", details=None):
    entry = {
        "action": action, 
        "status": status, 
        "message": message, 
        "details": details
    }
    call_db("app_log", "POST", entry)

def get_now_wib():
    return datetime.now(timezone(timedelta(hours=7)))

def get_stock_class(stok):
    if stok <= 20: return "stok-low"
    if stok <= 100: return "stok-mid"
    return "stok-high"

@st.cache_data(ttl=60)
def get_products():
    query = "produk?select=*,stok_masuk(harga_modal_satuan,tanggal_masuk)&order=nama_produk"
    prods = call_db(query)
    if prods:
        for p in prods:
            sm = p.get('stok_masuk', [])
            if sm:
                sm_sorted = sorted(sm, key=lambda x: x['tanggal_masuk'], reverse=True)
                p['latest_modal'] = sm_sorted[0]['harga_modal_satuan']
            else:
                p['latest_modal'] = 0
    return prods

# --- 3. SESSION STATE ---
if 'cart' not in st.session_state: st.session_state.cart = {}
if 'page' not in st.session_state: st.session_state.page = "🛒 Kasir"

# --- 4. SIDEBAR ---
with st.sidebar:
    st.title("🥤 Sumber Jaya")
    page = st.radio("Menu Utama", ["🛒 Kasir", "📦 Stok & Modal", "⚙️ Atur Produk", "🧾 Riwayat Nota", "📊 Laporan"])
    st.divider()
    if st.button("🔄 Segarkan Data", use_container_width=True):
        st.cache_data.clear()
        st.rerun()

# --- 5. HALAMAN KASIR ---
if page == "🛒 Kasir":
    st.header("🛒 Kasir Penjualan")
    # Terminology Check: Jualan (Grosir) & Rumah (Retail)
    price_mode = st.radio("Mode Harga:", ["Jualan", "Rumah"], index=0, horizontal=True)
    
    col_inv, col_cart = st.columns([1.6, 1.4])
    
    with col_inv:
        search = st.text_input("🔍 Cari Minuman...", placeholder="Ketik nama produk...")
        prods = get_products()
        if prods:
            filtered = [p for p in prods if search.lower() in p['nama_produk'].lower()] if search else prods
            for p in filtered:
                h_jual = p.get('harga_jual_grosir') if price_mode == "Jualan" else p.get('harga_jual_retail')
                # Stock Colors per SSOT
                st.markdown(f"""<div class="p-card {get_stock_class(p['stok'])}">
                    <b>{p['nama_produk']}</b> ({p['satuan']})<br>
                    <small>Stok: {p['stok']} | Harga: Rp {float(h_jual):,.0f}</small>
                </div>""", unsafe_allow_html=True)
                # Unique Key Constraint
                if st.button(f"Tambah Ke Keranjang 🛒", key=f"add_{p['id']}_{price_mode}", use_container_width=True):
                    pid = str(p['id'])
                    if pid in st.session_state.cart:
                        st.session_state.cart[pid]['qty'] += 1
                    else:
                        st.session_state.cart[pid] = {
                            "id": p['id'], "nama": p['nama_produk'], 
                            "harga": float(h_jual), "modal": float(p['latest_modal']), "qty": 1
                        }
                    st.rerun()

    with col_cart:
        st.subheader("🧺 Keranjang Belanja")
        if not st.session_state.cart:
            st.info("Keranjang masih kosong.")
        
        total_h, total_m = 0, 0
        for pid, itm in list(st.session_state.cart.items()):
            with st.container(border=True):
                col_name, col_ctrls = st.columns([1.5, 2.5])
                with col_name:
                    st.write(f"**{itm['nama']}**")
                    st.caption(f"Rp {itm['harga']:,.0f}")
                with col_ctrls:
                    c_min, c_qty, c_plus, c_del = st.columns([1, 1, 1, 1])
                    if c_min.button("➖", key=f"min_{pid}"):
                        if st.session_state.cart[pid]['qty'] > 1:
                            st.session_state.cart[pid]['qty'] -= 1
                        else:
                            del st.session_state.cart[pid]
                        st.rerun()
                    c_qty.markdown(f"<div class='cart-qty'>{itm['qty']}</div>", unsafe_allow_html=True)
                    if c_plus.button("➕", key=f"plus_{pid}"):
                        st.session_state.cart[pid]['qty'] += 1
                        st.rerun()
                    if c_del.button("❌", key=f"del_{pid}"):
                        del st.session_state.cart[pid]
                        st.rerun()
                total_h += itm['harga'] * itm['qty']
                total_m += itm['modal'] * itm['qty']

        if st.session_state.cart:
            st.divider()
            st.subheader(f"Total Bayar: Rp {total_h:,.0f}")
            catatan = st.text_input("Catatan / Nama Pelanggan", placeholder="Contoh: Pak Haji")
            status_bayar = st.radio("Status Pembayaran:", ["Belum Lunas", "Lunas"], index=0, horizontal=True)
            
            if st.button("💾 SIMPAN NOTA SEKARANG", type="primary", use_container_width=True):
                sale_data = {
                    "total_harga": total_h, "total_modal": total_m, 
                    "keuntungan_bersih": total_h - total_m,
                    "status_pembayaran": status_bayar, "catatan": catatan,
                    "waktu_transaksi": get_now_wib().isoformat(),
                    "waktu_pelunasan": get_now_wib().isoformat() if status_bayar == "Lunas" else None
                }
                res_p = call_db("penjualan", "POST", sale_data)
                if res_p:
                    nid = res_p[0]['id']
                    for pid, itm in st.session_state.cart.items():
                        call_db("item_penjualan", "POST", {
                            "penjualan_id": nid, "produk_id": int(pid), "jumlah": itm['qty'],
                            "harga_jual_satuan": itm['harga'], "harga_modal_satuan": itm['modal'],
                            "subtotal_harga": itm['harga'] * itm['qty'], "subtotal_modal": itm['modal'] * itm['qty']
                        })
                        # Log stock movement
                        call_db("stok_masuk", "POST", {
                            "produk_id": int(pid), "jumlah_masuk": -itm['qty'],
                            "harga_modal_satuan": itm['modal'], "keterangan": f"Penjualan #{nid}",
                            "tanggal_masuk": get_now_wib().isoformat()
                        })
                        p_data = call_db(f"produk?id=eq.{pid}&select=stok")
                        if p_data:
                            call_db(f"produk?id=eq.{pid}", "PATCH", {"stok": p_data[0]['stok'] - itm['qty']})
                    
                    log_action("Simpan Nota", "Sukses", f"Nota #{nid} disimpan", sale_data)
                    st.session_state.cart = {}
                    st.cache_data.clear()
                    st.success("Nota berhasil disimpan!")
                    st.rerun()
                else:
                    log_action("Simpan Nota", "Gagal", "Gagal menyimpan header transaksi")
                    st.error("Gagal menyimpan transaksi.")

# --- 6. STOK & MODAL ---
elif page == "📦 Stok & Modal":
    st.header("📦 Kelola Stok & Modal")
    prods = get_products() or []
    
    t_status, t_form, t_hist = st.tabs(["📊 Status Stok", "➕ Tambah Stok", "📜 Riwayat"])
    
    with t_status:
        # Pagination for Inventory (Rule: Max 10 items)
        search_inv = st.text_input("🔍 Cari Produk...", key="search_inv")
        filtered_inv = [p for p in prods if search_inv.lower() in p['nama_produk'].lower()] if search_inv else prods
        
        page_size = 10
        total_pages = (len(filtered_inv) - 1) // page_size + 1
        curr_page = st.number_input("Halaman", min_value=1, max_value=total_pages, step=1, key="page_inv") - 1
        
        start_idx = curr_page * page_size
        end_idx = start_idx + page_size
        
        cols = st.columns(2)
        for i, p in enumerate(filtered_inv[start_idx:end_idx]):
            with cols[i % 2]:
                st.markdown(f"""<div class="p-card {get_stock_class(p['stok'])}">
                    <small>{p['nama_produk']}</small><br>
                    <b style="font-size: 24px;">Stok: {p['stok']}</b><br>
                    <small>Modal Terakhir: Rp {float(p.get('latest_modal',0)):,.0f}</small>
                </div>""", unsafe_allow_html=True)

    with t_form:
        with st.form("form_stok"):
            sel_p = st.selectbox("Pilih Produk:", prods, format_func=lambda x: f"{x['nama_produk']} (Stok: {x['stok']})")
            qty_in = st.number_input("Jumlah Masuk:", min_value=1, step=1)
            m_price = st.number_input("Harga Modal Satuan:", value=float(sel_p['latest_modal'] if sel_p else 0), step=500.0)
            ket = st.text_input("Keterangan", placeholder="Distributor/Vendor")
            if st.form_submit_button("Simpan Stok"):
                res = call_db("stok_masuk", "POST", {
                    "produk_id": sel_p['id'], "jumlah_masuk": qty_in,
                    "harga_modal_satuan": m_price, "keterangan": ket,
                    "tanggal_masuk": get_now_wib().isoformat()
                })
                if res:
                    call_db(f"produk?id=eq.{sel_p['id']}", "PATCH", {"stok": sel_p['stok'] + qty_in})
                    log_action("Update Stok", "Sukses", f"Tambah {qty_in} ke {sel_p['nama_produk']}")
                    st.cache_data.clear(); st.success("Berhasil!"); st.rerun()

    with t_hist:
        hist = call_db("stok_masuk?select=*,produk(nama_produk)&order=tanggal_masuk.desc&limit=100")
        if hist:
            df = pd.DataFrame([{
                "Waktu": x['tanggal_masuk'][:16].replace('T',' '),
                "Produk": x['produk']['nama_produk'],
                "Qty": x['jumlah_masuk'],
                "Modal": f"Rp {float(x['harga_modal_satuan']):,.0f}"
            } for x in hist])
            st.table(df)

# --- 7. ATUR PRODUK ---
elif page == "⚙️ Atur Produk":
    st.header("⚙️ Master Produk")
    t1, t2 = st.tabs(["✏️ Edit Produk", "🆕 Tambah Baru"])
    prods = get_products() or []
    
    with t1:
        sel_p = st.selectbox("Pilih Produk:", prods, format_func=lambda x: x['nama_produk'])
        if sel_p:
            with st.form("edit_p"):
                name_p = st.text_input("Nama Produk", value=sel_p['nama_produk'])
                h_rumah = st.number_input("Harga Rumah", value=float(sel_p['harga_jual_retail']))
                h_jualan = st.number_input("Harga Jualan", value=float(sel_p['harga_jual_grosir'] or 0))
                if st.form_submit_button("Update Data"):
                    res = call_db(f"produk?id=eq.{sel_p['id']}", "PATCH", {
                        "nama_produk": name_p.strip(), "harga_jual_retail": h_rumah, "harga_jual_grosir": h_jualan
                    })
                    if res:
                        log_action("Update Produk", "Sukses", f"Update {name_p}")
                        st.cache_data.clear(); st.success("Data diupdate!"); st.rerun()

    with t2:
        with st.form("new_p"):
            n_name = st.text_input("Nama Produk Baru")
            n_sat = st.text_input("Satuan", value="dus")
            n_rumah = st.number_input("Harga Rumah", min_value=0)
            n_jualan = st.number_input("Harga Jualan", min_value=0)
            if st.form_submit_button("Simpan Produk"):
                clean_n = n_name.strip()
                # SSOT: Case-insensitive check
                if any(p['nama_produk'].lower() == clean_n.lower() for p in prods):
                    st.error("Nama produk sudah ada (Duplikat)!")
                else:
                    res = call_db("produk", "POST", {"nama_produk": clean_n, "satuan": n_sat, "harga_jual_retail": n_rumah, "harga_jual_grosir": n_jualan})
                    if res:
                        log_action("Tambah Produk", "Sukses", f"Produk baru: {clean_n}")
                        st.cache_data.clear(); st.success("Berhasil!"); st.rerun()

# --- 8. RIWAYAT NOTA ---
elif page == "🧾 Riwayat Nota":
    st.header("🧾 Riwayat Penjualan")
    # Pagination for Sales History (Rule: Max 10 items)
    query = "penjualan?select=*,item_penjualan(*,produk(nama_produk))&order=waktu_transaksi.desc"
    notas = call_db(query) or []
    
    if notas:
        search_nota = st.text_input("🔍 Cari Catatan/Pelanggan...", key="search_nota")
        f_notas = [n for n in notas if search_nota.lower() in (n['catatan'] or '').lower()] if search_nota else notas
        
        page_size = 10
        t_pages = (len(f_notas) - 1) // page_size + 1
        c_page = st.number_input("Halaman", min_value=1, max_value=t_pages, step=1, key="page_nota") - 1
        
        for n in f_notas[c_page*page_size : (c_page+1)*page_size]:
            with st.container(border=True):
                is_lunas = n['status_pembayaran'] == "Lunas"
                c1, c2, c3 = st.columns([2, 1, 1])
                c1.markdown(f"**Nota #{n['id']} | {n['catatan'] or 'Pelanggan'}**")
                c2.markdown(f"<span class='badge {'bg-lunas' if is_lunas else 'bg-belum'}'>{n['status_pembayaran']}</span>", unsafe_allow_html=True)
                c3.write(f"**Rp {float(n['total_harga']):,.0f}**")
                
                # 'Lunasin' Feature implementation
                if not is_lunas:
                    # Unique Key per SSOT
                    if st.button(f"Mark as Lunas ✅", key=f"pay_{n['id']}"):
                        now = get_now_wib().isoformat()
                        res = call_db(f"penjualan?id=eq.{n['id']}", "PATCH", {"status_pembayaran": "Lunas", "waktu_pelunasan": now})
                        if res:
                            log_action("Lunasin Nota", "Sukses", f"Nota #{n['id']} dilunasi", {"id": n['id'], "time": now})
                            st.success(f"Nota #{n['id']} Lunas!"); st.rerun()

                with st.expander("Lihat Detail & Struk"):
                    for i in n['item_penjualan']:
                        st.write(f"• {i['produk']['nama_produk']} ({i['jumlah']} x Rp {float(i['harga_jual_satuan']):,.0f})")
                    st.divider()
                    st.info(f"💡 Tekan Tab 'Persiapkan Struk' di printer thermal. Total Modal: Rp {float(n['total_modal']):,.0f} | Profit: Rp {float(n['keuntungan_bersih']):,.0f}")

# --- 9. LAPORAN ---
elif page == "📊 Laporan":
    st.header("📊 Laporan Penjualan")
    l_date = st.date_input("Pilih Periode", [date.today() - timedelta(days=6), date.today()])
    if len(l_date) == 2:
        query = f"penjualan?waktu_transaksi=gte.{l_date[0].isoformat()}&waktu_transaksi=lte.{l_date[1].isoformat()}T23:59:59&select=*,item_penjualan(*,produk(nama_produk))"
        data = call_db(query) or []
        if data:
            df = pd.DataFrame(data)
            gross, modal, net = df['total_harga'].astype(float).sum(), df['total_modal'].astype(float).sum(), df['keuntungan_bersih'].astype(float).sum()
            c1, c2, c3 = st.columns(3)
            c1.metric("Gross", f"Rp {gross:,.0f}")
            c2.metric("Modal", f"Rp {modal:,.0f}")
            c3.metric("Net Profit", f"Rp {net:,.0f}", delta=f"{(net/gross*100):.1f}%" if gross > 0 else "0%")
            
            st.divider()
            st.subheader("📈 Pendapatan Harian")
            df['tgl'] = pd.to_datetime(df['waktu_transaksi']).dt.date
            daily = df.groupby('tgl')['total_harga'].sum()
            st.line_chart(daily)
            
            st.subheader("🔥 Produk Terlaris")
            items = []
            for n in data:
                for i in n['item_penjualan']:
                    items.append({"Prod": i['produk']['nama_produk'], "Qty": i['jumlah']})
            if items:
                df_top = pd.DataFrame(items).groupby("Prod")["Qty"].sum().sort_values(ascending=False).head(10)
                st.bar_chart(df_top)
