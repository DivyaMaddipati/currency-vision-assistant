from PIL import Image
from src.inference.inference import Inference
import os

class CurrencyService:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), '../src/models/IC_ResNet34_9880.pth')
        self.model = Inference(model_path)
    
    def detect_currency(self, image: Image.Image) -> str:
        try:
            # Convert image to RGB if it's not
            if image.mode != 'RGB':
                image = image.convert('RGB')
                
            self.model.run_image(image, show=False)
            result = self.model.return_result()
            return result
        except Exception as e:
            print(f"Error in currency detection: {str(e)}")
            raise e