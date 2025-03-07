
from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
from services.person_service import PersonService

person_bp = Blueprint('person', __name__)
person_service = PersonService()

@person_bp.route('/detect_persons', methods=['POST'])
def detect_persons():
    try:
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        result = person_service.detect_persons(frame)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in detect_persons: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add a route that can be used by the frontend's detect_frame endpoint
@person_bp.route('/detect_frame', methods=['POST'])
def detect_frame():
    try:
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        result = person_service.detect_persons(frame)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in detect_frame: {str(e)}")
        return jsonify({"error": str(e)}), 500

@person_bp.route('/model_status', methods=['GET'])
def model_status():
    try:
        # Check if models are loaded and ready
        is_ready = person_service.is_model_ready()
        return jsonify({"ready": is_ready})
    except Exception as e:
        print(f"Error checking model status: {str(e)}")
        return jsonify({"ready": False, "error": str(e)}), 500
