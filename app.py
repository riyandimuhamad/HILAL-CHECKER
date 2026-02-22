from flask import Flask, render_template, jsonify, request
from engine import run_full_engine, get_location_data

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/predict')
def predict():
    # Menangkap pilihan "Time Machine" dari Frontend
    target_bulan = request.args.get('target', 'auto')
    data, is_cached = run_full_engine(target=target_bulan)
    return jsonify({
        'status': 'success',
        'is_cached': is_cached,
        'data': data
    })

@app.route('/api/location')
def predict_location():
    try:
        # Menangkap request koordinat dari frontend
        lat = float(request.args.get('lat', 0))
        lon = float(request.args.get('lon', 0))
        target_bulan = request.args.get('target', 'auto')
        
        # Jalankan mesin hitung khusus lokasi
        data = get_location_data(lat, lon, target_bulan)
        return jsonify(data)
    
    except Exception as e:
        import traceback
        traceback.print_exc() # Print ke terminal VS Code kalau error
        return jsonify({"error": f"Backend Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)