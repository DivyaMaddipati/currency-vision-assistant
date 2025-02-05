from PIL import Image
from src.inference.inference import Inference

class CurrencyService:
    def __init__(self):
        self.model = Inference('src/models/IC_ResNet34_9880.pth')
    
    def detect_currency(self, image: Image.Image) -> str:
        self.model.run_image(image, show=False)
        result = self.model.return_result()
        return result