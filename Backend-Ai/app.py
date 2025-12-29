import sys
import os
import time
import queue
import json
import logging
from urllib.request import urlopen
from urllib.error import URLError, HTTPError
from flask import Flask, request, jsonify, send_from_directory, abort, Response
from functools import wraps
from werkzeug.exceptions import NotFound
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
 
# Logging config
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(BASE_DIR, 'src')
AI_MODEL_DIR = os.path.join(SRC_DIR, 'aimodel')
sys.path.append(AI_MODEL_DIR)

app = Flask(__name__)

# API key for authentication
API_KEY = "m4Z8&XqW!T2^P7Y@V9b$N1K5g*J3RC6xQz&pM^v!Gt$yXnBwK8T"
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

 
# Authentication middleware
def auth_middleware(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            if request.is_json:
                data = request.get_json(force=True)
            else:
                data = request.form.to_dict()
            if not data or data.get("API_KEY") != API_KEY:
                return jsonify({"error": "Unauthorized", "status": "error"}), 401
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Authentication failed: {str(e)}")
            return jsonify({"error": "Authentication failed", "status": "error"}), 500
    return wrapper

# File read helper
def safe_read_file(file_path, encoding='utf-8'):
    try:
        if not os.path.exists(file_path):
            return None
        with open(file_path, encoding=encoding) as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, encoding='utf-8-sig') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read file {file_path}: {str(e)}")
            return None
    except Exception as e:
        logger.error(f"Failed to read file {file_path}: {str(e)}")
        return None

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Page not found", "status": "error"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({"error": "Internal server error", "status": "error"}), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({"error": "File too large", "status": "error"}), 413

# Routes for static pages
@app.route('/')
def homepage():
    file_path = os.path.join(SRC_DIR, 'homepage', 'homepage.html')
    content = safe_read_file(file_path)
    if content is None:
        return jsonify({"error": "Homepage not available"}), 404
    return content

@app.route('/voice')
def voice_index():
    file_path = os.path.join(SRC_DIR, 'voice', 'index.html')
    content = safe_read_file(file_path)
    if content is None:
        return jsonify({"error": "Voice interface not available"}), 404
    return content



@app.route('/frontend')
def frontend():
    file_path = os.path.join(SRC_DIR, 'frontend', 'frontend.html')
    content = safe_read_file(file_path)
    if content is None:
        return jsonify({"error": "Frontend not available"}), 404
    return content

@app.route('/voice.html')
def voice_html():
    return voice_index()



@app.route('/frontend.html')
def frontend_html():
    return frontend()

@app.route('/homepage.html')
def homepage_html():
    return homepage()

# Serve static and asset files
@app.route('/static/<path:filename>')
def static_files(filename):
    try:
        static_dir = os.path.join(SRC_DIR, 'voice')
        file_path = os.path.join(static_dir, filename)
        if not os.path.commonpath([static_dir, file_path]) == static_dir:
            abort(404)
        if not os.path.exists(file_path):
            abort(404)
        return send_from_directory(static_dir, filename)
    except Exception as e:
        logger.error(f"Error serving static file {filename}: {str(e)}")
        abort(404)

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    try:
        asset_dirs = ['voice', 'frontend', 'homepage']
        for asset_dir in asset_dirs:
            asset_path = os.path.join(SRC_DIR, asset_dir)
            file_path = os.path.join(asset_path, filename)
            if os.path.commonpath([asset_path, file_path]) == asset_path and os.path.exists(file_path):
                return send_from_directory(asset_path, filename)
        abort(404)
    except Exception as e:
        logger.error(f"Error serving asset {filename}: {str(e)}")
        abort(404)

# Preload AI model
try:
    from use_model import run_prediction as model_predict
    logger.info("AI model preloaded successfully.")
except ImportError:
    model_predict = None
    logger.error("AI model could not be loaded at startup.")

# ThreadPool for timeout
executor = ThreadPoolExecutor(max_workers=2)

@app.route('/request', methods=['POST'])
@auth_middleware
def request_route():
    try:
        if request.is_json:
            data = request.get_json(force=True)
        else:
            data = request.form.to_dict()

        message = data.get('message')
        if not message or not message.strip():
            return jsonify({"status": "error", "error": "Message is required"}), 400
        if len(message) > 1000:
            return jsonify({"status": "error", "error": "Message too long"}), 400
        if model_predict is None:
            return jsonify({"status": "error", "error": "AI model not available"}), 503

        try:
            future = executor.submit(model_predict, message)
            command_number = future.result(timeout=5)  # seconds
            logger.info(f"Prediction result: {command_number}")
        except FuturesTimeout:
            logger.error("Prediction timed out.")
            return jsonify({"status": "error", "error": "Prediction timeout"}), 504
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return jsonify({"status": "error", "error": "Prediction failed"}), 500

        # Send command to device
        url = f"http://10.208.41.212/setcmd/{command_number}"
        try:
            with urlopen(url, timeout=10) as response:
                if response.status == 200:
                    return Response(str(command_number), mimetype='text/plain'), 200
                else:
                    logger.error(f"Device returned status: {response.status}")
                    return Response("Failed to fetch command", status=500)
        except (URLError, HTTPError) as e:
            logger.error(f"Device connection error: {str(e)}")
            return Response("Error connecting to device", status=502)

    except Exception as e:
        logger.error(f"Request processing error: {str(e)}")
        return jsonify({"status": "error", "error": "Request processing failed"}), 500

 
@app.route('/styles.css')
def serve_styles():
    return static_files('styles.css')

@app.route('/script.js')
def serve_script():
    return static_files('script.js')

@app.route('/<path:filename>')
def serve_any_file(filename):
    try:
        allowed_extensions = {'.css', '.js', '.html', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg'}
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in allowed_extensions:
            abort(404)
        search_dirs = ['voice', 'frontend', 'homepage']
        for search_dir in search_dirs:
            file_path = os.path.join(SRC_DIR, search_dir, filename)
            if os.path.exists(file_path):
                dir_path = os.path.join(SRC_DIR, search_dir)
                if os.path.commonpath([dir_path, file_path]) == dir_path:
                    return send_from_directory(dir_path, filename)
        abort(404)
    except Exception as e:
        logger.error(f"Error serving file {filename}: {str(e)}")
        abort(404)

@app.route('/api/info')
def api_info():
    return jsonify({
        "name": "RasPi AI Module API",
        "version": "1.0.0",
        "endpoints": {
            "/": "Homepage",
            "/voice": "Voice interface",
            "/frontend": "Frontend interface",
            "/request": "AI prediction endpoint (POST)", 
            "/health": "Health check",
            "/static/<filename>": "Static files",
            "/assets/<filename>": "Asset files"
        }
    })
if __name__ == '__main__':
    # Load AI model before starting the server
    try:
        from use_model import run_prediction as model_predict
        logger.info("AI model loaded successfully.")
    except ImportError:
        model_predict = None
        logger.error("AI model could not be loaded. Exiting.")
        sys.exit(1)  # Stop server if model fails to load

    # Optional: warm up the model
    if model_predict:
        try:
            logger.info("Warming up AI model...") 
            logger.info("AI model ready.")
        except Exception as e:
            logger.error(f"Model warm-up failed: {str(e)}")
            sys.exit(1)

    # Now start the Flask server
    app.run(host='0.0.0.0', port=5500, threaded=True, debug=False)
