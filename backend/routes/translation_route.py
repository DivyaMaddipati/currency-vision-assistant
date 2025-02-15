
from flask import Blueprint, request, jsonify
from services.translation_service import TranslationService

translation_bp = Blueprint('translation', __name__)
translation_service = TranslationService()

@translation_bp.route('/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        text = data.get('text')
        target_lang = data.get('target_lang', 'te_IN')
        source_lang = data.get('source_lang', 'en_XX')

        if not text:
            return jsonify({"error": "No text provided"}), 400

        result = translation_service.translate(text, source_lang, target_lang)
        
        if "error" in result:
            return jsonify(result), 500
            
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
