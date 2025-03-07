
import cv2
import torch
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from utils.distance import calculate_distance
import time

class PersonService:
    def __init__(self):
        print("Initializing PersonService and loading model...")
        start_time = time.time()
        self.model = fasterrcnn_resnet50_fpn(pretrained=True)
        self.model.eval()
        self.PERSON_CLASS_ID = 1  # Class ID for 'person' in COCO dataset
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f} seconds")
        
    def detect_persons(self, frame):
        start_time = time.time()
        
        # Convert the frame to tensor
        transform = transforms.ToTensor()
        frame_tensor = transform(frame).unsqueeze(0)
        
        # Perform detection
        with torch.no_grad():
            predictions = self.model(frame_tensor)[0]
        
        # Extract bounding boxes, labels, and scores
        boxes = predictions['boxes'].cpu().numpy()
        labels = predictions['labels'].cpu().numpy()
        scores = predictions['scores'].cpu().numpy()
        
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
        
        processing_time = time.time() - start_time
        print(f"Person detection completed in {processing_time:.3f}s, found {person_count} persons")
        
        return {
            "persons": persons,
            "person_count": person_count,
            "frame_height": frame.shape[0],
            "frame_width": frame.shape[1],
            "objects": persons  # Include persons as objects for compatibility
        }
