import cv2
import numpy as np
import os
from pathlib import Path

class ObjectService:
    def __init__(self):
        # Get the current file's directory
        current_dir = Path(__file__).parent.parent
        
        # Load class names
        self.classFile = str(current_dir / 'src/dataset/coco.names')
        with open(self.classFile, 'rt') as f:
            self.classNames = f.read().rstrip('\n').split('\n')

        # Load average sizes
        self.average_sizes_file = str(current_dir / 'src/dataset/average_sizes.txt')
        self.average_sizes = {}
        with open(self.average_sizes_file, 'rt') as f:
            for line in f:
                obj, size = line.strip().split(',')
                self.average_sizes[obj.strip()] = float(size.strip())

        # Load model
        self.configPath = str(current_dir / 'src/models/ssd_mobilenet_v3_large_coco_2020_01_14.pbtxt')
        self.weightsPath = str(current_dir / 'src/models/frozen_inference_graph.pb')
        
        self.net = cv2.dnn_DetectionModel(self.weightsPath, self.configPath)
        self.net.setInputSize(320, 320)
        self.net.setInputScale(1.0 / 127.5)
        self.net.setInputMean((127.5, 127.5, 127.5))
        self.net.setInputSwapRB(True)
        
        self.thres = 0.45
        self.nms_threshold = 0.2
        self.focal_length = 615

    def calculate_distance(self, object_width, real_width):
        return (real_width * self.focal_length) / (object_width + 1e-6)

    def get_position(self, frame_width, box):
        x = box[0]
        if x < frame_width // 3:
            return "left"
        elif x < 2 * (frame_width // 3):
            return "center"
        else:
            return "right"

    def detect_objects(self, frame):
        frame_height, frame_width = frame.shape[:2]
        
        classIds, confs, bbox = self.net.detect(frame, confThreshold=self.thres)
        
        objects = []
        if len(classIds) > 0:
            bbox = list(bbox)
            confs = list(np.array(confs).reshape(1, -1)[0])
            confs = list(map(float, confs))
            
            indices = cv2.dnn.NMSBoxes(bbox, confs, self.thres, self.nms_threshold)
            
            for i in indices.flatten():
                box = bbox[i]
                x, y, w, h = map(int, box)
                
                class_id = int(classIds[i])
                label = self.classNames[class_id - 1].lower()
                confidence = float(confs[i])
                
                distance = None
                if label in self.average_sizes:
                    distance = self.calculate_distance(w, self.average_sizes[label])
                
                position = self.get_position(frame_width, (x, y, w, h))
                
                objects.append({
                    "label": label,
                    "confidence": confidence,
                    "position": position,
                    "distance": f"{distance:.1f}m" if distance else None,
                    "box": [x, y, x + w, y + h]
                })
        
        return {
            "objects": objects,
            "frame_height": frame_height,
            "frame_width": frame_width
        }