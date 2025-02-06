from flask import Blueprint, request, jsonify
from PIL import Image
import io
from services.currency_service import CurrencyService

currency_bp = Blueprint('currency', __name__)
currency_service = CurrencyService()

@currency_bp.route('/detect_currency', methods=['POST', 'OPTIONS'])
def detect_currency():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
        
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
            
        file = request.files['image']
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        result = currency_service.detect_currency(image)
        
        response = jsonify({"result": result})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error in detect_currency: {str(e)}")
        return jsonify({"error": str(e)}), 500