let map;
let specialMarker = null; // Untuk menyimpan marker lokasi spesifik yang dicari pengguna

window.onload = function() {
    updateDates();
    setInterval(updateClock, 1000);
    updateClock();
    if (localStorage.getItem('theme') === 'light') document.documentElement.classList.remove('dark');
};

function updateDates() {
    const today = new Date();
    document.getElementById('tglMasehi').innerText = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let dd = String(today.getDate()).padStart(2, '0'), mm = String(today.getMonth() + 1).padStart(2, '0'), yyyy = today.getFullYear();
    fetch(`https://api.aladhan.com/v1/gToH?date=${dd}-${mm}-${yyyy}&adjustment=-1`)
        .then(r => r.json()).then(d => {
            document.getElementById('tglHijriah').innerText = `${d.data.hijri.day} ${d.data.hijri.month.en} ${d.data.hijri.year} H`;
        });
}

function updateClock() {
    document.getElementById('liveClock').innerText = new Date().toLocaleTimeString('id-ID') + " WIB";
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function jalankanPrediksi() {
    // 1. Persiapan UI & Halaman
    document.getElementById('landingDashboard').classList.add('hidden');
    document.getElementById('loadingSection').classList.remove('hidden');
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('historyPage').classList.add('hidden');

    // 2. Logika Dynamic Loading Text
    const loadingTexts = [
        "SYNCHRONIZING JPL DATA",
        "FETCHING NASA EPHEMERIS",
        "CALCULATING LUNAR ORBIT",
        "ANALYZING MABIMS CRITERIA",
        "RENDERING GLOBAL COORDINATES"
    ];
    
    let textIdx = 0;
    const textElement = document.getElementById('loadingText');
    if(textElement) textElement.innerText = loadingTexts[0];

    // Mulai ganti teks tiap 800ms
    const loadingInterval = setInterval(() => {
        textIdx = (textIdx + 1) % loadingTexts.length;
        if(textElement) textElement.innerText = loadingTexts[textIdx];
    }, 800);

    // 3. Ambil Tanggal Running Saat Ini
    const skrg = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const tglSekarang = skrg.toLocaleDateString('en-GB', options);

    let targetValue = document.getElementById('targetBulan').value;
    let targetText = document.getElementById('targetBulan').options[document.getElementById('targetBulan').selectedIndex].text;
    
    // 4. Eksekusi API
    fetch('/api/predict?target=' + targetValue)
        .then(r => r.json()).then(res => {
            // HENTIKAN INTERVAL LOADING TEPAT SAAT DATA MASUK
            clearInterval(loadingInterval);
            const data = res.data;
            // Update UI Metrics
            document.getElementById('valAlt').innerText = data.max_alt.toFixed(2) + '°';
            document.getElementById('valElong').innerText = data.max_elong.toFixed(2) + '°';
            document.getElementById('valIjtima').innerText = data.waktu_ijtima.split('|')[1];
            
            // PAKSA TAMPILKAN TANGGAL RUNNING BUKAN TANGGAL TARGET
            document.getElementById('valDate').innerText = tglSekarang; 
            
            document.getElementById('valUmur').innerText = data.umur_hilal + ' J';
            document.getElementById('valIluminasi').innerText = data.iluminasi + ' %';
            document.getElementById('valLag').innerText = data.lag_time + ' M';

            let isLolos = (data.max_alt >= 3.0 && data.max_elong >= 6.4);
            document.getElementById('statusMabims').innerText = 'KESIMPULAN: ' + (isLolos ? "✅ LOLOS MABIMS" : "❌ BELUM LOLOS");
            
            // PESAN EDUKASI DENGAN TANGGAL RUNNING
            document.getElementById('pesanEdukasi').innerText = `Analisis NASA menunjukkan pada ${tglSekarang} (Running Saat Ini) hilal ${isLolos ? "sudah" : "belum"} memenuhi standar visibilitas MABIMS.`;

            // Selesaikan Loading & Tampilkan Hasil
            document.getElementById('loadingSection').classList.add('hidden');
            document.getElementById('resultContainer').classList.remove('hidden');
            document.getElementById('btnBackHeader').classList.replace('hidden', 'flex');
            
            renderPeta(data.points);
            
            // Simpan ke riwayat
            simpanKeRiwayat(targetText, tglSekarang);
        })
        .catch(err => {
            clearInterval(loadingInterval);
            console.error(err);
            alert("Terjadi kesalahan saat sinkronisasi data NASA.");
            resetTampilan();
        });
}

function renderPeta(points) {
    if(!map) {
        map = L.map('map').setView([-2.5, 118], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map);
    }
    
    // Hapus layer lama sebelum menggambar ulang
    map.eachLayer((l) => { if(!!l.toGeoJSON) map.removeLayer(l); });

    // Gambar ulang semua titik koordinat
    points.forEach((p, i) => {
        // Kita tampilkan titik setiap kelipatan 20 agar tidak lag, tapi tetap akurat
        if (i % 20 === 0 && p.tinggi > 0) {
            let isPass = (p.tinggi >= 3.0 && p.elongasi >= 6.4);
            
            // Logic warna: Biru untuk Lolos, Abu-abu untuk Tidak Lolos
            L.circleMarker([p.lat, p.lon], { 
                radius: isPass ? 4 : 2, 
                color: isPass ? '#3211d4' : '#4b5563', 
                fillOpacity: 0.8,
                weight: 1
            }).addTo(map);
        }
    });
}

function resetTampilan() {
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('historyPage').classList.add('hidden');
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('landingDashboard').classList.remove('hidden');
    document.getElementById('btnBackHeader').classList.replace('flex', 'hidden');
}

function bukaHalamanRiwayat() {
    document.getElementById('landingDashboard').classList.add('hidden');
    document.getElementById('resultContainer').classList.add('hidden');
    document.getElementById('historyPage').classList.remove('hidden');
    document.getElementById('btnBackHeader').classList.replace('hidden', 'flex');
    tampilkanRiwayat();
}

function simpanKeRiwayat(title, date) {
    let history = JSON.parse(localStorage.getItem('hilalHistory')) || [];
    const newEntry = { id: Date.now(), title, date, time: new Date().toLocaleTimeString('id-ID') };
    history.unshift(newEntry);
    if(history.length > 9) history.pop();
    localStorage.setItem('hilalHistory', JSON.stringify(history));
}

function tampilkanRiwayat() {
    const history = JSON.parse(localStorage.getItem('hilalHistory')) || [];
    const container = document.getElementById('historyFullList');
    if(!container) return;

    if(history.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                <span class="material-symbols-outlined text-6xl text-slate-700 mb-4">history</span>
                <p class="text-slate-500 italic">Belum ada riwayat analisis.</p>
            </div>`;
        return;
    }

    // Tambahkan tombol "Hapus Semua" di bagian atas jika ada data
    let html = history.map(item => `
        <div class="glass-card p-6 rounded-2xl border border-border-dark group hover:border-primary/50 transition-all relative">
            <button onclick="hapusSatuRiwayat(${item.id})" class="absolute top-4 right-4 text-slate-500 hover:text-red-500 transition-colors">
                <span class="material-symbols-outlined text-sm">delete</span>
            </button>
            <div class="text-primary mb-3"><span class="material-symbols-outlined">history_edu</span></div>
            <h4 class="text-white font-bold mb-1">${item.title}</h4>
            <p class="text-slate-500 text-[10px]">${item.date} • ${item.time}</p>
        </div>
    `).join('');

    // Tambahkan tombol Bersihkan Semua di awal
    container.innerHTML = `
        <div class="col-span-full flex justify-end mb-4">
            <button onclick="bersihkanSemuaRiwayat()" class="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 transition-all">
                <span class="material-symbols-outlined text-sm">delete_sweep</span> BERSIHKAN SEMUA
            </button>
        </div>
        ${html}
    `;
}

function showProfileInfo() { alert("Analyst: Riyandi Muhamad Rizki\nSI ITG 2023"); }

function unduhLaporanPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const clean = (t) => t.replace(/[^\x00-\x7F]/g, "").trim();

            // 1. Header Background
            doc.setFillColor(50, 17, 212);
            doc.rect(0, 0, 210, 40, 'F');
            
            // 2. Header Text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.setTextColor(255, 255, 255);
            doc.text("HILAL-CHECKER", 20, 22);
            
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("Professional Observation Report | Powered by Dibalik Data", 20, 30);
            doc.text("Analyst: Riyandi Muhamad Rizki", 140, 22);
            doc.text("Sistem: NASA JPL DE421 Ephemeris", 140, 28); // Disesuaikan agar lebih general

            // 3. Judul Laporan Dinamis
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(50, 17, 212);
            const safeTitle = clean(document.getElementById('eventTitle').innerText);
            doc.text(safeTitle, 20, 55);
            
            doc.setDrawColor(200);
            doc.line(20, 60, 190, 60);

            // 4. Tabel Data Astronomi
            doc.setFontSize(11);
            doc.setTextColor(0);
            doc.text("DATA ASTRONOMI & EPHEMERIS:", 20, 70);

            const dataTable = [
                ["Tinggi Hilal Max", document.getElementById('valAlt').innerText],
                ["Sudut Elongasi Max", document.getElementById('valElong').innerText],
                ["Waktu Ijtima' (WIB)", document.getElementById('valIjtima').innerText],
                ["Tanggal Observasi", document.getElementById('valDate').innerText],
                ["Umur Hilal", document.getElementById('valUmur').innerText],
                ["Fraksi Iluminasi", document.getElementById('valIluminasi').innerText],
                ["Mukuts (Lag Time)", document.getElementById('valLag').innerText]
            ];

            let y = 80;
            dataTable.forEach(row => {
                doc.setFont("helvetica", "normal");
                doc.setFillColor(245, 245, 250);
                doc.rect(20, y - 5, 170, 7, 'F');
                doc.text(row[0], 25, y);
                doc.setFont("helvetica", "bold");
                doc.text(": " + row[1], 80, y);
                y += 8;
            });

            // 5. Logika Status & Pesan Edukasi (Dinamis)
            const tglObs = document.getElementById('valDate').innerText;
            const rawStatus = document.getElementById('statusMabims').innerText;
            const isLolos = rawStatus.includes("✅");
            
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            if(isLolos) {
                doc.setTextColor(46, 125, 50);
                doc.text("STATUS: MEMENUHI KRITERIA MABIMS", 20, 150);
            } else {
                doc.setTextColor(239, 68, 68);
                doc.text("STATUS: BELUM MEMENUHI KRITERIA (ISTIKMAL)", 20, 150);
            }

            // Bagian yang Bos minta: Menghapus "Analisis NASA" dan mengikuti tanggal sistem
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.setFont("helvetica", "italic");
            
            const narasiDinamis = `Berdasarkan parameter astronomi pada ${tglObs}, hasil perhitungan sistem menunjukkan bahwa hilal ${isLolos ? "sudah" : "belum"} memenuhi standar visibilitas MABIMS di wilayah hukum Indonesia.`;
            
            const splitEdukasi = doc.splitTextToSize(narasiDinamis, 170);
            doc.text(splitEdukasi, 20, 160);

            // 6. Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.setFont("helvetica", "normal");
            const printedAt = new Date().toLocaleString('id-ID', { 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            });
            doc.text("© 2026 Riyandi Muhamad Rizki | Hak Cipta Dilindungi", 105, 280, { align: "center" });
            doc.text("Dicetak pada: " + printedAt + " WIB", 105, 285, { align: "center" });

            // 7. Save File
            doc.save(`Laporan_Hilal_${new Date().getTime()}.pdf`);
        }

function hapusSatuRiwayat(id) {
    if(confirm("Hapus item riwayat ini?")) {
        let history = JSON.parse(localStorage.getItem('hilalHistory')) || [];
        history = history.filter(item => item.id !== id);
        localStorage.setItem('hilalHistory', JSON.stringify(history));
        tampilkanRiwayat(); // Refresh tampilan
    }
}

function bersihkanSemuaRiwayat() {
    if(confirm("Apakah Bos yakin ingin menghapus SELURUH riwayat analisis?")) {
        localStorage.removeItem('hilalHistory');
        tampilkanRiwayat(); // Refresh tampilan
    }
}

function cariLokasiSpesifik() {
            let q = document.getElementById('inputLokasi').value;
            if(!q) return alert("Masukkan nama lokasi!");
            
            document.getElementById('pesanLokasi').classList.remove('hidden');
            
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=id`)
                .then(r => r.json())
                .then(geo => {
                    if (geo.length === 0) {
                        alert("Lokasi tidak ditemukan!");
                        document.getElementById('pesanLokasi').classList.add('hidden');
                        return;
                    }
                    
                    let lat = geo[0].lat, lon = geo[0].lon;
                    let namaTempat = geo[0].display_name.split(",")[0];
                    
                    fetch(`/api/location?lat=${lat}&lon=${lon}&target=${document.getElementById('targetBulan').value}`)
                        .then(r => r.json())
                        .then(astro => {
                            document.getElementById('pesanLokasi').classList.add('hidden');
                            map.setView([lat, lon], 10);
                            
                            let statusWarna = astro.is_pass ? "#3211d4" : "#ef4444";
                            let statusTeks = astro.is_pass ? "✅ LOLOS MABIMS" : "❌ TIDAK LOLOS";

                            let content = `
                                <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 200px; color: #131022;">
                                    <h4 style="margin:0 0 5px 0; color:#3211d4;">📍 ${namaTempat}</h4>
                                    <p style="margin:0 0 10px 0; font-size:10px; color:#666;">Lat: ${parseFloat(lat).toFixed(4)}, Lon: ${parseFloat(lon).toFixed(4)}</p>
                                    
                                    <table style="width:100%; font-size:12px; margin-bottom:10px; border-collapse: collapse;">
                                        <tr><td style="padding: 2px 0;">Tinggi Hilal</td><td>: <b>${astro.tinggi}°</b></td></tr>
                                        <tr><td style="padding: 2px 0;">Elongasi</td><td>: <b>${astro.elongasi}°</b></td></tr>
                                        <tr><td style="padding: 2px 0;">Umur Hilal</td><td>: <b>${astro.umur} Jam</b></td></tr>
                                        <tr><td style="padding: 2px 0;">Iluminasi</td><td>: <b>${astro.iluminasi}%</b></td></tr>
                                        <tr><td style="padding: 2px 0;">Mukuts</td><td>: <b>${astro.lag_time} m</b></td></tr>
                                        <tr style="border-top: 1px dashed #ccc;">
                                            <td style="padding: 5px 0 2px 0; color: #E65100; font-weight: bold;">☁️ Cuaca</td>
                                            <td style="padding: 5px 0 2px 0; color: #E65100;">: <b>${astro.cloud_cover}% (${astro.cuaca_status})</b></td>
                                        </tr>
                                    </table>

                                    <div style="background:${statusWarna}; color:white; padding:6px; text-align:center; border-radius:6px; font-weight:bold; font-size:11px;">
                                        ${statusTeks}
                                    </div>
                                    ${astro.cloud_cover >= 75 ? `<p style="margin: 5px 0 0 0; font-size: 9px; color: #ef4444; text-align: center;">⚠️ <i>Terhalang mendung tebal</i></p>` : ''}
                                </div>
                            `;
                            L.popup().setLatLng([lat, lon]).setContent(content).openOn(map);
                        });
                });
        }

function shareHasil() {
    // Ambil data real-time dari UI Bos
    const tgl = document.getElementById('valDate').innerText;
    const ijtima = document.getElementById('valIjtima').innerText;
    const tinggi = document.getElementById('valAlt').innerText;
    const elong = document.getElementById('valElong').innerText;
    const kesimpulan = document.getElementById('statusMabims').innerText;
    const narasi = document.getElementById('pesanEdukasi').innerText;

    // Format pesan ala Analyst Professional
    const pesan = `*HILAL-CHECKER REPORT* 🌙
*Dibalik Data*
-------------------------------------------
📅 *Tanggal:* ${tgl}
⏱️ *Ijtima':* ${ijtima}

📊 *Data Astronomi:*
- Tinggi Hilal: ${tinggi}
- Elongasi: ${elong}

📢 *${kesimpulan}*
_${narasi}_
-------------------------------------------
_Analyst: Riyandi Muhamad Rizki_
_Dataset: NASA JPL DE421_`;

    // Copy ke clipboard
    navigator.clipboard.writeText(pesan).then(() => {
        alert("✅ Laporan Berhasil Disalin! Silakan paste di WhatsApp.");
    }).catch(err => {
        console.error('Gagal menyalin: ', err);
    });
}