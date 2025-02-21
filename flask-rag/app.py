# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from rag_module import ChatPDF
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, supports_credentials=True)

# Configure app settings
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = '/tmp'

# Initialize ChatPDF instance
chat_pdf = ChatPDF()

def handle_options_request():
    """Handle OPTIONS request with CORS headers"""
    # return jsonify({'status': 'success'})
    response = jsonify({'status': 'success'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', '*')
    response.headers.add('Access-Control-Allow-Methods', '*')
    return response

# for test purposes
@app.route('/', methods=['GET', 'OPTIONS'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/ingest', methods=['POST', 'OPTIONS'])
def ingest_document():
    logger.info("Ingesting document")
    if request.method == 'OPTIONS':
        return handle_options_request()

    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected"}), 400

    try:
        # Save the file temporarily
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(temp_path)
        # Process the file
        result = chat_pdf.ingest(temp_path)
        
        # Clean up
        os.remove(temp_path)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error during ingestion: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/ask', methods=['POST', 'OPTIONS'])
def ask_question():
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        data = request.json
        if not data or 'query' not in data:
            return jsonify({"status": "error", "message": "No query provided"}), 400
        
        result = chat_pdf.ask(
            data['query'],
            k=data.get('k', 5),
            score_threshold=data.get('score_threshold', 0.2)
        )
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/clear', methods=['POST', 'OPTIONS'])
def clear_store():
    if request.method == 'OPTIONS':
        return handle_options_request()

    try:
        result = chat_pdf.clear()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error clearing store: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)