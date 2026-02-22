import os
import json
import numpy as np
import math
import random # Ditambahkan untuk simulasi cuaca
from datetime import datetime, timedelta
from skyfield.api import load, wgs84
from skyfield import almanac

# Load Ephemeris di luar fungsi agar cepat (sekali load)
ts = load.timescale()
try:
    eph = load('de421.bsp')
except Exception as e:
    print("Gagal meload de421.bsp. Pastikan file ada di direktori.")
    raise e

sun = eph['sun']
moon = eph['moon']
earth = eph['earth']

def run_full_engine(target='auto'):
    cache_file = 'hilal_cache.json'
    
    # --- 1. SISTEM CACHE BERDASARKAN TARGET BULAN ---
    cache_data = {}
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)
        except:
            pass
            
    # Jika data untuk bulan yang dipilih sudah ada di cache & umurnya < 24 jam
    if target in cache_data:
        target_cache = cache_data[target]
        try:
            ts_cache = datetime.fromisoformat(target_cache['timestamp'])
            if (datetime.now() - ts_cache).total_seconds() < 86400: # 24 Jam
                return target_cache['results'], True
        except:
            pass

    # --- 2. FITUR TIME MACHINE (MENENTUKAN RENTANG WAKTU PENCARIAN) ---
    if target == 'ramadhan_1447':
        t0 = ts.utc(2026, 2, 10) # Feb 2026
        t1 = ts.utc(2026, 3, 10)
        event_name = "🌙 Analisis Ramadhan 1447 H"
    elif target == 'syawal_1447':
        t0 = ts.utc(2026, 3, 10) # Mar 2026
        t1 = ts.utc(2026, 4, 10)
        event_name = "🕌 Analisis Syawal 1447 H (Idul Fitri)"
    elif target == 'zulhijjah_1447':
        t0 = ts.utc(2026, 5, 10) # Mei 2026
        t1 = ts.utc(2026, 6, 10)
        event_name = "🕋 Analisis Zulhijjah 1447 H (Idul Adha)"
    else:
        # Default: Cari hilal terdekat dari hari ini
        now = datetime.utcnow()
        t0 = ts.utc(now.year, now.month, now.day)
        t1 = t0 + timedelta(days=40)
        event_name = "🔭 Analisis Hilal Bulan Baru Terdekat"

    # --- 3. MENCARI WAKTU IJTIMA' ---
    t, phase = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))
    new_moon_time = None
    for ti, ph in zip(t, phase):
        if ph == 0:  # 0 = fase Ijtima' / New Moon
            new_moon_time = ti
            break

    # PERBAIKAN 1: Gunakan 'is None'
    if new_moon_time is None:
        raise ValueError("Ijtima' tidak ditemukan dalam rentang waktu yang diberikan.")

    new_moon_utc = new_moon_time.utc_datetime()
    obs_date = new_moon_utc.date()

    # --- 4. GRID SAMPLING SELURUH INDONESIA ---
    lats = np.arange(-11.0, 6.0 + 0.25, 0.25) 
    lons = np.arange(94.0, 142.0 + 0.25, 0.25)
    
    grid_results = []
    max_alt = -999.0
    max_elong = -999.0
    best_lat = 0
    best_lon = 0
    best_maghrib_tt = None

    t0_m = ts.utc(obs_date.year, obs_date.month, obs_date.day, 0)
    t1_m = ts.utc(obs_date.year, obs_date.month, obs_date.day, 23, 59)

    for lat in lats:
        for lon in lons:
            topos = wgs84.latlon(lat, lon)
            lokasi_earth = earth + topos

            # Cari waktu Maghrib (Sunset) di koordinat ini
            f_sun = almanac.sunrise_sunset(eph, topos)
            t_sun, y_sun = almanac.find_discrete(t0_m, t1_m, f_sun)
            
            maghrib = None
            for ti, yi in zip(t_sun, y_sun):
                if yi == 0: # 0 artinya matahari tenggelam
                    maghrib = ti
                    break

            if maghrib is not None:
                if maghrib.tt < new_moon_time.tt:
                    alt_moon_deg = -5.0
                    elong_deg = 0.0
                else:
                    astrometric_moon = lokasi_earth.at(maghrib).observe(moon)
                    alt_moon, _, _ = astrometric_moon.apparent().altaz()
                    astrometric_sun = lokasi_earth.at(maghrib).observe(sun)
                    elongation = astrometric_moon.separation_from(astrometric_sun)
                    
                    alt_moon_deg = float(alt_moon.degrees)
                    elong_deg = float(elongation.degrees)

                    if alt_moon_deg > max_alt:
                        max_alt = alt_moon_deg
                        max_elong = elong_deg
                        best_lat = lat
                        best_lon = lon
                        best_maghrib_tt = maghrib

                grid_results.append({
                    'lat': float(lat),
                    'lon': float(lon),
                    'tinggi': alt_moon_deg,
                    'elongasi': elong_deg
                })

    # --- 5. KALKULASI METRIK ADVANCED PADA TITIK TERBAIK ---
    umur_hilal_str = "-"
    lag_time_str = "-"
    iluminasi_str = "-"

    if best_maghrib_tt is not None and max_alt > -5:
        # A. UMUR HILAL
        umur_jam = (best_maghrib_tt.tt - new_moon_time.tt) * 24.0
        umur_hilal_str = f"{umur_jam:.1f}"

        # B. FRAKSI ILUMINASI (%)
        ilum_pct = 0.5 * (1 - math.cos(math.radians(max_elong))) * 100
        iluminasi_str = f"{ilum_pct:.2f}"

        # C. LAG TIME (MUKUTS)
        best_topos = wgs84.latlon(best_lat, best_lon)
        f_moon = almanac.risings_and_settings(eph, moon, best_topos)
        besok_date = obs_date + timedelta(days=1)
        t_m, y_m = almanac.find_discrete(best_maghrib_tt, ts.utc(besok_date.year, besok_date.month, besok_date.day, 6), f_moon)
        
        moonset = None
        for ti, yi in zip(t_m, y_m):
            if yi == 0:
                moonset = ti
                break
        
        if moonset is not None:
            lag_mnt = (moonset.tt - best_maghrib_tt.tt) * 24.0 * 60.0
            lag_time_str = f"{lag_mnt:.0f}"

    # --- 6. PENYUSUNAN HASIL AKHIR ---
    waktu_ijtima_wib = (new_moon_utc + timedelta(hours=7)).strftime("%d %b %Y | %H:%M WIB")

    final_results = {
        'event_title': event_name,
        'max_alt': max_alt if max_alt > -5 else 0,
        'max_elong': max_elong if max_elong > -5 else 0,
        'waktu_ijtima': waktu_ijtima_wib,
        'tgl_obs_raw': obs_date.strftime("%d %B %Y"),
        'umur_hilal': umur_hilal_str,
        'iluminasi': iluminasi_str,
        'lag_time': lag_time_str,
        'points': grid_results
    }

    cache_data[target] = {
        'timestamp': datetime.now().isoformat(),
        'results': final_results
    }
    
    with open(cache_file, 'w') as f:
        json.dump(cache_data, f)

    return final_results, False


def get_location_data(lat, lon, target='auto'):
    """Fungsi khusus untuk menghitung 1 titik lokasi + Simulasi Cuaca"""
    if target == 'ramadhan_1447':
        t0 = ts.utc(2026, 2, 10)
        t1 = ts.utc(2026, 3, 10)
    elif target == 'syawal_1447':
        t0 = ts.utc(2026, 3, 10)
        t1 = ts.utc(2026, 4, 10)
    elif target == 'zulhijjah_1447':
        t0 = ts.utc(2026, 5, 10)
        t1 = ts.utc(2026, 6, 10)
    else:
        now = datetime.utcnow()
        t0 = ts.utc(now.year, now.month, now.day)
        t1 = t0 + timedelta(days=40)

    t, phase = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))
    new_moon_time = None
    for ti, ph in zip(t, phase):
        if ph == 0:
            new_moon_time = ti
            break

    if new_moon_time is None:
        return {"error": "Ijtima' tidak ditemukan"}

    obs_date = new_moon_time.utc_datetime().date()
    topos = wgs84.latlon(lat, lon)
    lokasi_earth = earth + topos

    t0_m = ts.utc(obs_date.year, obs_date.month, obs_date.day, 0)
    t1_m = ts.utc(obs_date.year, obs_date.month, obs_date.day, 23, 59)
    
    f_sun = almanac.sunrise_sunset(eph, topos)
    t_sun, y_sun = almanac.find_discrete(t0_m, t1_m, f_sun)
    
    maghrib = None
    for ti, yi in zip(t_sun, y_sun):
        if yi == 0:
            maghrib = ti
            break

    if maghrib is None or maghrib.tt < new_moon_time.tt:
        return {"error": "Hilal belum wujud saat Maghrib di lokasi ini."}

    # Kalkulasi Metrik Astronomi
    astrometric_moon = lokasi_earth.at(maghrib).observe(moon)
    alt_moon, _, _ = astrometric_moon.apparent().altaz()
    astrometric_sun = lokasi_earth.at(maghrib).observe(sun)
    elongation = astrometric_moon.separation_from(astrometric_sun)
    
    alt_deg = float(alt_moon.degrees)
    elong_deg = float(elongation.degrees)
    umur_jam = (maghrib.tt - new_moon_time.tt) * 24.0
    ilum_pct = 0.5 * (1 - math.cos(math.radians(elong_deg))) * 100

    besok_date = obs_date + timedelta(days=1)
    f_moon = almanac.risings_and_settings(eph, moon, topos)
    t_m, y_m = almanac.find_discrete(maghrib, ts.utc(besok_date.year, besok_date.month, besok_date.day, 6), f_moon)
    
    lag_mnt = 0
    for ti, yi in zip(t_m, y_m):
        if yi == 0:
            lag_mnt = (ti.tt - maghrib.tt) * 24.0 * 60.0
            break

    # --- SIMULASI CUACA (CLOUD COVER) ---
    cloud_cover = random.randint(5, 95) # Persentase awan 5% - 95%
    if cloud_cover < 30:
        cuaca_status = "Cerah"
    elif cloud_cover < 70:
        cuaca_status = "Berawan"
    else:
        cuaca_status = "Mendung/Hujan"

    return {
        "status": "success",
        "tinggi": round(alt_deg, 2),
        "elongasi": round(elong_deg, 2),
        "umur": round(umur_jam, 1),
        "iluminasi": round(ilum_pct, 2),
        "lag_time": round(lag_mnt, 0),
        "cloud_cover": cloud_cover,
        "cuaca_status": cuaca_status,
        "is_pass": (alt_deg >= 3.0 and elong_deg >= 6.4 and cloud_cover < 75)
    }