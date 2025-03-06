
import cv2
import torch
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from utils.distance import calculate_distance

class PersonService:
    def __init__(self):
        self.model = None
        self.is_ready = False
        self.PERSON_CLASS_ID = 1  # Class ID for 'person' in COCO dataset
        self.load_model()
        
    def load_model(self):
        try:
            print("Loading person detection model...")
            self.model = fasterrcnn_resnet50_fpn(pretrained=True)
            self.model.eval()
            self.is_ready = True
            print("Person detection model loaded successfully")
        except Exception as e:
            print(f"Error loading person detection model: {str(e)}")
            self.is_ready = False
    
    def is_model_ready(self):
        return self.is_ready
        
    def detect_persons(self, frame):
        if not self.is_ready or self.model is None:
            print("Model not ready yet")
            return {
                "persons": [],
                "person_count": 0,
                "frame_height": frame.shape[0],
                "frame_width": frame.shape[1],
                "objects": [],
                "is_model_ready": False
            }
            
        # Convert the frame to tensor
        transform = transforms.ToTensor()
        frame_tensor = transform(frame).unsqueeze(0)
        
        # Perform detection
        with torch.no_grad():
            predictions = self.model(frame_tensor)[0]
        
        # Extract bounding boxes, labels, and scores
        boxes = predictions['boxes'].numpy()
        labels = predictions['labels'].numpy()
        scores = predictions['scores'].numpy()
        
        persons = []
        person_count = 0
        
        # Filter for persons with a confidence threshold
        for i, label in enumerate(labels):
            if label == self.PERSON_CLASS_ID and scores[i] > 0.6:  # Detect only persons
                person_count += 1
                box = boxes[i].astype(int)
                
                # Calculate distance based on the bounding box height
                height = box[3] - box[1]
                distance = calculate_distance(height)
                
                # Determine position in frame (left, center, right)
                frame_width = frame.shape[1]
                center_x = (box[0] + box[2]) / 2
                if center_x < frame_width/3:
                    position = "left"
                elif center_x < 2*frame_width/3:
                    position = "center"
                else:
                    position = "right"
                
                # Store person data with label indicating it's a person
                persons.append({
                    "label": f"Person {person_count}",
                    "distance": f"{distance:.1f}m",
                    "confidence": float(scores[i]),
                    "position": position,
                    "box": box.tolist()
                })
        
        # Draw person count on the frame (for debugging purposes)
        cv2.putText(frame, f"Person Count: {person_count}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        
        return {
            "persons": persons,
            "person_count": person_count,
            "frame_height": frame.shape[0],
            "frame_width": frame.shape[1],
            "objects": persons,  # Include persons as objects for compatibility
            "is_model_ready": True
        }
