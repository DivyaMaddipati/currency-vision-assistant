
from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
import time
from services.person_service import PersonService

person_bp = Blueprint('person', __name__)
person_service = PersonService()

# Track models initialization status
MODEL_STATUS = {"ready": False, "message": "Models are being prepared..."}

# Initialize models in the background and set status
def initialize_models():
    global MODEL_STATUS
    try:
        # Ensure model is initialized
        if person_service and person_service.model:
            MODEL_STATUS = {"ready": True, "message": "Models ready"}
        else:
            MODEL_STATUS = {"ready": False, "message": "Models failed to initialize"}
    except Exception as e:
        MODEL_STATUS = {"ready": False, "message": f"Error initializing models: {str(e)}"}

# Initialize models when module loads
initialize_models()

@person_bp.route('/models_status', methods=['GET'])
def get_models_status():
    return jsonify(MODEL_STATUS)

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
        start_time = time.time()
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        result = person_service.detect_persons(frame)
        processing_time = time.time() - start_time
        print(f"Frame processing time: {processing_time:.2f}s, Person count: {result['person_count']}")
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in detect_frame: {str(e)}")
        return jsonify({"error": str(e)}), 500
