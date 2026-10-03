# Panduan Pasang Web App Langsung di Google Spreadsheet (100% Gratis Selamanya)

Dengan metode **Google Apps Script (GAS)**, aplikasi web ini akan hidup langsung di dalam Google Drive dan Google Spreadsheet Anda.
- **Biaya**: **Rp 0 / Gratis Selamanya** (disediakan langsung oleh infrastruktur Google).
- **Akses Online**: Mendapatkan link HTTPS resmi dari Google (`https://script.google.com/macros/s/.../exec`) yang bisa dibuka dari HP, tablet, maupun laptop di mana saja tanpa perlu menyalakan komputer kantor.
- **Database**: Terhubung otomatis ke lembar kerja spreadsheet yang sedang aktif tanpa perlu setting API token rumit.

---

## 3 Langkah Mudah Pemasangan:

### Langkah 1: Buka Apps Script di Google Spreadsheet
1. Buka Google Spreadsheet Anda (misal: *Rekap Gaji CV AJN* atau spreadsheet kepegawaian lainnya).
2. Di menu atas Google Spreadsheet, klik:  
   **Ekstensi** > **Apps Script**.

### Langkah 2: Salin Kode
1. Di halaman Apps Script yang terbuka, ganti isi file `Code.gs` dengan kode dari file:
   > **`gas/Code.gs`**
2. Klik ikon tanda tambah **(+)** di samping kiri > Pilih **HTML** > Beri nama file: `index`.
3. Buka file `public/index.html` di komputer Anda, lalu salin dan tempel isinya ke file `index.html` di Apps Script.
4. Klik tombol **Simpan (Ctrl + S)**.

### Langkah 3: Deploy Jadi Web App Online
1. Di pojok kanan atas Apps Script, klik tombol biru **Deploy** > Pilih **New deployment** (Penerapan baru).
2. Klik ikon gerigi (Settings) di samping kiri > Pilih **Web app**.
3. Atur pengaturannya:
   - **Description**: Web App Laporan Kepegawaian
   - **Execute as**: *Me (email Anda)*
   - **Who has access**: *Anyone* (Siapa saja yang memiliki link) atau *Anyone with Google account*.
4. Klik **Deploy** dan berikan izin akses Google (*Authorize Access*).
5. Anda akan langsung mendapatkan **URL Web App** resmi dari Google.
6. Simpan link tersebut di bookmark HP atau bagikan ke rekan kerja Anda!
