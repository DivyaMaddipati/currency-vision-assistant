from flask import Blueprint, request, jsonify
import cv2
import numpy as np
import base64
from ..models.currency_detector import CurrencyDetector
from ..utils.distance import calculate_distance
from ultralytics import YOLO
from PIL import Image
import io

bp = Blueprint('detection', __name__)
yolo_model = YOLO("yolov8n.pt")
currency_detector = CurrencyDetector()

@bp.route('/detect_frame', methods=['POST'])
def detect_frame():
    try:
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        results = yolo_model(frame)
        
        persons = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                if box.cls == 0:  # Person class in YOLO
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    height = y2 - y1
                    distance = calculate_distance(height)
                    confidence = float(box.conf[0])
                    
                    frame_width = frame.shape[1]
                    center_x = (x1 + x2) / 2
                    if center_x < frame_width/3:
                        position = "left"
                    elif center_x < 2*frame_width/3:
                        position = "center"
                    else:
                        position = "right"
                        
                    persons.append({
                        "distance": f"{distance:.1f}m",
                        "confidence": confidence,
                        "position": position
                    })
        
        return jsonify({
            "persons": persons,
            "frame_height": frame.shape[0],
            "frame_width": frame.shape[1]
        })
        
    except Exception as e:
        print(f"Error in detect_frame: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/detect_currency', methods=['POST'])
def detect_currency():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
            
        file = request.files['image']
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        currency_value = currency_detector.detect(image)
        
        return jsonify({"currency_value": currency_value})
        
    except Exception as e:
        print(f"Error in detect_currency: {str(e)}")
        return jsonify({"error": str(e)}), 500