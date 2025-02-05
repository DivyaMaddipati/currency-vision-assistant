from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import torch
from torchvision import transforms
from PIL import Image
import io
import base64
from gtts import gTTS
import os
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load YOLO model for object detection
yolo_model = YOLO("yolov8n.pt")

# Load currency detection model (you'll need to implement this based on your model)
class CurrencyDetector:
    def detect(self, image):
        # Placeholder - implement your currency detection logic here
        return "10" # Example return value

currency_detector = CurrencyDetector()

def calculate_distance(box_height, real_height=1.7):
    # Focal length (you may need to calibrate this for your camera)
    focal_length = 615
    return (real_height * focal_length) / box_height

@app.route('/detect_frame', methods=['POST'])
def detect_frame():
    try:
        data = request.json
        image_data = data['frame'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Run YOLO detection
        results = yolo_model(frame)
        
        # Process detections
        persons = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                if box.cls == 0:  # Person class in YOLO
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    height = y2 - y1
                    distance = calculate_distance(height)
                    confidence = float(box.conf[0])
                    
                    # Calculate position
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

@app.route('/detect_currency', methods=['POST'])
def detect_currency():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image provided"}), 400
            
        file = request.files['image']
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # Detect currency value
        currency_value = currency_detector.detect(image)
        
        return jsonify({"currency_value": currency_value})
        
    except Exception as e:
        print(f"Error in detect_currency: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.json
        text = data.get('text', '')
        language = data.get('language', 'en')
        
        # Generate speech
        tts = gTTS(text=text, lang=language)
        
        # Save to memory
        audio_io = io.BytesIO()
        tts.write_to_fp(audio_io)
        audio_io.seek(0)
        
        return audio_io.getvalue(), 200, {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename=speech.mp3'
        }
        
    except Exception as e:
        print(f"Error in speak: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)