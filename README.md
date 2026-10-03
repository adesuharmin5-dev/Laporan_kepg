# Aplikasi Laporan Kepegawaian & Kehadiran Eksekutif (HR Executive Report Generator)

Aplikasi otomatis untuk menghasilkan **Laporan Eksekutif Kepegawaian & Kehadiran Karyawan (6 Halaman Landscape A4)** dari data absensi mentah berbasis AI, dilengkapi manajemen penguncian periode historis (*period locking*), komparasi Month-over-Month (MoM), dukungan multi-bahasa (Indonesia & English), dan ekspor cetak PDF berpresisi tinggi.

---

## 🚀 Cara Menjalankan Aplikasi

### Cara 1: Menggunakan File Pintasan (Paling Mudah)
Cukup **klik ganda (double-click)** pada file:
> **`JALANKAN_APLIKASI.bat`**

Browser Anda akan otomatis terbuka ke alamat:  
👉 **`http://localhost:3000`**

### Cara 2: Melalui Terminal / Command Prompt
Buka terminal di folder ini, lalu jalankan:
```powershell
node server.js
```
Lalu buka browser di `http://localhost:3000`.

### Cara 3: Membuka File Offline (Tanpa Perlu Menjalankan Node.js)
Buka langsung file berikut di Google Chrome / Microsoft Edge:
> **`Laporan_Kehadiran_Eksekutif_Offline.html`**

---

## 📁 Struktur Direktori & Berkas

```
G:\My Drive\Aplikasi\Laporan_kepeg\
│
├── JALANKAN_APLIKASI.bat                 # Shortcut 1-klik untuk menjalankan server & web
├── Laporan_Kehadiran_Eksekutif_Offline.html # File laporan interaktif mandiri (bisa dibuka offline)
├── README.md                             # Panduan penggunaan lengkap
├── server.js                             # Server web lokal Node.js
├── export_pdf.js                         # Script CLI untuk ekspor otomatis PDF Landscape A4
├── package.json                          # Konfigurasi dependensi (xlsx, pdf-parse)
│
├── src/                                  # Modul Inti Aplikasi
│   ├── calculator.js                     # Mesin kalkulasi matematis (menit, skor, delta, ranking)
│   ├── html_renderer.js                  # Engine perender 6 slide deck eksekutif
│   ├── i18n.js                           # Kamus bilingual (Indonesia & English)
│   ├── narrative_ai.js                   # AI generator narasi analisis, insight & rekomendasi
│   ├── parser.js                         # Parser berkas Excel (.xlsx), CSV, dan JSON
│   ├── pdf_ai_parser.js                  # AI Parser untuk membaca dan menjabarkan berkas PDF mentah
│   └── period_manager.js                 # Pengelola penguncian periode & komparasi MoM
│
├── public/                               # Antarmuka Web Dashboard
│   ├── index.html                        # Halaman utama aplikasi web
│   ├── client.js                         # Logika interaktif, navigasi tab & dialog upload
│   ├── template_kehadiran_karyawan.xlsx  # Template resmi Excel untuk pengisian data absensi
│   └── template_kehadiran_karyawan.csv   # Template format CSV
│
├── data/                                 # Basis Data Periode Terkunci
│   ├── periods.json                      # Indeks daftar periode yang telah dikunci
│   ├── juni_2026.json                    # Data terkunci periode Juni 2026
│   └── agustus_2026.json                 # Data terkunci periode Agustus 2026
│
├── exports/                              # Hasil Ekspor PDF Siap Pakai
│   ├── Laporan_Eksekutif_JUNI_2026_ID.pdf  # PDF Eksekutif 6 Hal (Bahasa Indonesia)
│   └── Laporan_Eksekutif_JUNI_2026_EN.pdf  # PDF Eksekutif 6 Hal (English Version)
│
└── samples/                              # Dokumen Sumber Contoh
    ├── Contoh_Data_Mentah_Juni_2026.pdf  # File PDF mentah absensi Juni 2026
    └── Contoh_Deck_Laporan_Agustus_2026.pdf # File PDF contoh deck eksekutif Agustus 2026
```

---

## 🛠️ Fitur-Fitur Utama

1. **Database dari Spreadsheet (Excel & Google Sheets)**:
   - **Spreadsheet Database Engine (`data/database_kepegawaian.xlsx`)**: Seluruh data periode, data kehadiran karyawan (81+ baris), demografi, dan master pegawai tersimpan dalam format spreadsheet multi-sheet yang dapat diedit langsung di Microsoft Excel.
   - **Integrasi Cloud Google Spreadsheet API**: Terhubung langsung dengan akun Google Spreadsheet Anda (seperti *Rekap Gaji CV AJN*, *Rincian Gaji*, dan *Checklist Kepegawaian*).
   - **Tarik Data Otomatis**: Membaca nama karyawan, divisi, jabatan, dan potongan kehadiran langsung dari lembar kerja Google Sheet (misal tab *JUNI 2026*, *JULI 2026*, *AGUSTUS 2026*).
   - **Ekspor ke Google Sheet**: Menyimpan dan mengekspor seluruh laporan periode yang telah dikunci ke lembar kerja baru di Google Sheet Anda.
   - **Unduh & Unggah Database**: Tombol unduh spreadsheet database langsung dari web UI dan fitur restore dengan drag-and-drop file `.xlsx`.
2. **Upload Berkas Multi-Format**:
   - Mendukung **PDF (`.pdf`)**, Excel (`.xlsx`, `.xls`), CSV, dan JSON.
3. **AI Menjabarkan Data PDF & Auto-Generate Pegawai**:
   - AI secara otomatis mengekstrak tabel kehadiran, nama karyawan, menit & hari terlambat, serta profil demografi.
   - **Jumlah Pegawai di-generate otomatis dari dalam aplikasi**, Anda tidak perlu lagi menghitung atau mengetik angka secara manual.
4. **Kunci Periode (*Period Locking*)**:
   - Mengunci snapshot data bulan tertentu agar historis kehadiran tidak berubah.
   - Otomatis menghitung selisih perbaikan/penurunan terhadap periode baseline sebelumnya.
5. **Cetak Semua Halaman Presisi (A4 Landscape 6 Halaman)**:
   - Tombol **"Cetak Semua Halaman (PDF 6 Hal)"** langsung menyusun ke-6 slide ke format A4 Landscape tanpa terpotong (1 slide = 1 halaman penuh).
6. **Ekspor Otomatis Lewat Perintah Terminal**:
   ```powershell
   node export_pdf.js juni_2026 id     # Menghasilkan PDF Bahasa Indonesia
   node export_pdf.js juni_2026 en     # Menghasilkan PDF English
   ```
