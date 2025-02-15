
from transformers import MBartForConditionalGeneration, MBart50TokenizerFast
import os

class TranslationService:
    def __init__(self):
        self.model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models', 'mbart_model')
        self.model = None
        self.tokenizer = None
        self.load_model()

    def load_model(self):
        try:
            if not os.path.exists(self.model_dir):
                os.makedirs(self.model_dir, exist_ok=True)
                self.model = MBartForConditionalGeneration.from_pretrained("facebook/mbart-large-50-many-to-many-mmt")
                self.tokenizer = MBart50TokenizerFast.from_pretrained("facebook/mbart-large-50-many-to-many-mmt")
                self.model.save_pretrained(self.model_dir)
                self.tokenizer.save_pretrained(self.model_dir)
            else:
                self.model = MBartForConditionalGeneration.from_pretrained(self.model_dir)
                self.tokenizer = MBart50TokenizerFast.from_pretrained(self.model_dir)
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise

    def translate(self, text, src_lang="en_XX", tgt_lang="te_IN"):
        if not text or not isinstance(text, str):
            return {"error": "Invalid input text"}
            
        try:
            encoded_text = self.tokenizer(text, return_tensors="pt", padding=True, truncation=True)
            self.tokenizer.src_lang = src_lang
            forced_bos_token_id = self.tokenizer.lang_code_to_id[tgt_lang]
            
            generated_tokens = self.model.generate(
                **encoded_text, 
                forced_bos_token_id=forced_bos_token_id,
                max_length=128
            )
            
            translation = self.tokenizer.batch_decode(generated_tokens, skip_special_tokens=True)
            return {"translation": translation[0]}
        except Exception as e:
            return {"error": f"Translation failed: {str(e)}"}
