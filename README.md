# HILAL-CHECKER 🌙
**Predictive Astronomy Engine | Professional Analytics by Dibalik Data**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://riyandimuhamad.pythonanywhere.com)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Framework-Flask-lightgrey)](https://flask.palletsprojects.com/)

HILAL-CHECKER adalah aplikasi berbasis web yang dirancang untuk mensimulasikan visibilitas hilal di seluruh wilayah Indonesia dengan tingkat presisi tinggi. Aplikasi ini mengintegrasikan data astronomi NASA dengan kriteria visibilitas MABIMS terbaru (3° & 6.4°).

## 🚀 Live Demo
Aplikasi dapat diakses secara publik pada tautan berikut:
👉 [**riyandimuhamad.pythonanywhere.com**](https://riyandimuhamad.pythonanywhere.com)

## ✨ Fitur Utama
- **High-Precision Astronomy**: Menggunakan data ephemeris **NASA JPL DE421** untuk kalkulasi posisi Bulan dan Matahari yang sangat akurat.
- **MABIMS Compliance**: Implementasi otomatis kriteria visibilitas terbaru (Tinggi Hilal 3° & Elongasi 6.4°).
- **Global Mapping & Specific Search**: Visualisasi peta interaktif dengan Leaflet JS dan fitur pencarian titik observasi spesifik (Contoh: Bosscha, Garut).
- **Professional Analytics Dashboard**: Tampilan data real-time meliputi Ijtima', Umur Bulan, Iluminasi, dan Mukuts.
- **Enterprise Reporting**: Ekspor hasil analisis ke dalam dokumen PDF resmi dengan format Kop Surat profesional.
- **Social Integration**: Fitur "Salin Laporan" yang diformat khusus untuk berbagi hasil analisis ke WhatsApp secara rapi.
- **History Management**: Fitur riwayat analisis lokal untuk melacak hasil kalkulasi sebelumnya.

## 🛠️ Teknologi yang Digunakan
- **Backend**: Python (Flask)
- **Astronomy Engine**: Skyfield Library
- **Database Ephemeris**: NASA JPL DE421
- **Frontend**: Tailwind CSS, JavaScript (ES6+)
- **Interactive Maps**: Leaflet JS
- **Export Engine**: jsPDF & html2canvas

## ⚙️ Cara Menjalankan (Lokal)
1. Clone repositori ini:
   ```bash
   git clone [https://github.com/riyandimuhamad/HILAL-CHECKER.git](https://github.com/riyandimuhamad/HILAL-CHECKER.git)