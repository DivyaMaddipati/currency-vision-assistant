
from flask import Blueprint, request, jsonify
from services.translation_service import TranslationService

translation_bp = Blueprint('translation', __name__)
translation_service = TranslationService()

@translation_bp.route('/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        text = data.get('text')
        
        # Map frontend language codes to mBART language codes
        language_map = {
            'en': 'en_XX',  # English
            'hi': 'hi_IN',  # Hindi
            'te': 'te_IN',  # Telugu
            'ja': 'ja_XX',  # Japanese
            'zh': 'zh_CN',  # Chinese
            'es': 'es_XX'   # Spanish
        }
        
        target_lang = language_map.get(data.get('target_lang', 'en'), 'en_XX')
        source_lang = language_map.get(data.get('source_lang', 'en'), 'en_XX')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        result = translation_service.translate(text, source_lang, target_lang)
        
        if "error" in result:
            return jsonify(result), 500
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
