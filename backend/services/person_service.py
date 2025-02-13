
import cv2
import torch
from torchvision import transforms
from torchvision.models.detection import fasterrcnn_resnet50_fpn
from utils.distance import calculate_distance

class PersonService:
    def __init__(self):
        self.model = fasterrcnn_resnet50_fpn(pretrained=True)
        self.model.eval()
        self.PERSON_CLASS_ID = 1
        
    def detect_persons(self, frame):
        transform = transforms.ToTensor()
        frame_tensor = transform(frame).unsqueeze(0)
        
        with torch.no_grad():
            predictions = self.model(frame_tensor)[0]
        
        persons = []
        boxes = predictions['boxes'].numpy()
        labels = predictions['labels'].numpy()
        scores = predictions['scores'].numpy()
        
        person_count = 0
        for i, label in enumerate(labels):
            if label == self.PERSON_CLASS_ID and scores[i] > 0.6:
                person_count += 1
                box = boxes[i].astype(int)
                height = box[3] - box[1]
                distance = calculate_distance(height)
                
                frame_width = frame.shape[1]
                center_x = (box[0] + box[2]) / 2
                if center_x < frame_width/3:
                    position = "left"
                elif center_x < 2*frame_width/3:
                    position = "center"
                else:
                    position = "right"
                    
                persons.append({
                    "distance": f"{distance:.1f}m",
                    "confidence": float(scores[i]),
                    "position": position
                })
        
        return {
            "persons": persons,
            "person_count": person_count,
            "frame_height": frame.shape[0],
            "frame_width": frame.shape[1]
        }
