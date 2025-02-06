from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
from services.object_service import ObjectService

object_bp = Blueprint('object', __name__)
object_service = ObjectService()

@object_bp.route('/detect_objects', methods=['POST', 'OPTIONS'])
def detect_objects():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response
        
    try:
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        result = object_service.detect_objects(frame)
        
        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error in detect_objects: {str(e)}")
        return jsonify({"error": str(e)}), 500