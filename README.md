# HILAL-CHECKER 🌙
**Predictive Astronomy Engine | Powered by Dibalik Data**

HILAL-CHECKER adalah aplikasi berbasis web yang dirancang untuk mensimulasikan visibilitas hilal di seluruh wilayah Indonesia dengan tingkat presisi tinggi. Aplikasi ini mengintegrasikan data astronomi NASA dengan kriteria visibilitas MABIMS terbaru.

## ✨ Fitur Utama
- **High-Precision Astronomy**: Menggunakan data ephemeris NASA JPL DE421 untuk kalkulasi posisi Bulan dan Matahari.
- **MABIMS Compliance**: Mengacu pada kriteria terbaru (Tinggi Hilal 3° & Elongasi 6.4°).
- **Time Machine**: Fitur prediksi untuk bulan-bulan penting (Ramadhan, Syawal, Zulhijjah) di tahun 2026.
- **Specific Location Search**: Integrasi GPS untuk pengecekan visibilitas di titik observasi spesifik (Contoh: Bosscha, Pelabuhan Ratu).
- **Weather Awareness**: Simulasi tutupan awan (*Cloud Cover*) yang mempengaruhi hasil akhir visibilitas di lokasi spesifik.
- **Professional PDF Report**: Ekspor hasil analisis ke dalam dokumen PDF resmi dengan format Kop Surat.

## 🛠️ Teknologi yang Digunakan
- **Backend**: Python (Flask)
- **Astronomy Library**: Skyfield (NASA JPL DE421 Ephemeris)
- **Frontend**: HTML5, CSS3, JavaScript
- **Maps**: Leaflet JS
- **PDF Engine**: jsPDF & html2canvas

## 🚀 Cara Menjalankan (Lokal)
1. Pastikan Python 3.x sudah terinstall.
2. Install dependensi:
   ```bash
   pip install flask numpy skyfield