
import cv2
import torch
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from utils.distance import calculate_distance

class PersonService:
    def __init__(self):
        self.model = fasterrcnn_resnet50_fpn(pretrained=True)
        self.model.eval()
        self.PERSON_CLASS_ID = 1  # Class ID for 'person' in COCO dataset
        
    def detect_persons(self, frame):
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
                
                # Draw bounding box and label on frame
                cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)
                cv2.putText(frame, f"Person {person_count}", (box[0], box[1] - 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        # Display total person count on the frame
        cv2.putText(frame, f"Total Persons: {person_count}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        # Make sure to print person_count for debugging
        print(f"Detected {person_count} persons")
        
        return {
            "persons": persons,
            "person_count": person_count,
            "frame_height": frame.shape[0],
            "frame_width": frame.shape[1],
            "objects": persons  # Include persons as objects for compatibility
        }
