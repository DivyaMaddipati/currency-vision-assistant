from ultralytics import YOLO
import cv2

class ObjectService:
    def __init__(self):
        self.model = YOLO("src/models/yolov8n.pt")
        
    def detect_objects(self, frame):
        frame_height, frame_width, _ = frame.shape
        left_boundary = frame_width // 3
        right_boundary = 2 * frame_width // 3
        
        results = self.model(frame)
        objects = []
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                object_center_x = (x1 + x2) // 2
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                
                if object_center_x < left_boundary:
                    position = "left"
                elif object_center_x > right_boundary:
                    position = "right"
                else:
                    position = "center"
                    
                objects.append({
                    "class_id": class_id,
                    "confidence": confidence,
                    "position": position,
                    "box": [x1, y1, x2, y2]
                })
                
        return {
            "objects": objects,
            "frame_height": frame_height,
            "frame_width": frame_width
        }