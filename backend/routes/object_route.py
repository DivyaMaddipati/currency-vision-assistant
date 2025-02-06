from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
from services.object_service import ObjectService

object_bp = Blueprint('object', __name__)
object_service = ObjectService()

@object_bp.route('/detect_frame', methods=['POST', 'OPTIONS'])
def detect_frame():
    if request.method == 'OPTIONS':
        return '', 204
        
    try:
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        result = object_service.detect_objects(frame)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in detect_frame: {str(e)}")
        return jsonify({"error": str(e)}), 500