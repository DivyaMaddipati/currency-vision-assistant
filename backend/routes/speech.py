from flask import Blueprint, request, jsonify
from gtts import gTTS
import io

bp = Blueprint('speech', __name__)

@bp.route('/speak', methods=['POST'])
def speak():
    try:
        data = request.json
        text = data.get('text', '')
        language = data.get('language', 'en')
        
        tts = gTTS(text=text, lang=language)
        
        audio_io = io.BytesIO()
        tts.write_to_fp(audio_io)
        audio_io.seek(0)
        
        return audio_io.getvalue(), 200, {
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'attachment; filename=speech.mp3'
        }
        
    except Exception as e:
        print(f"Error in speak: {str(e)}")
        return jsonify({"error": str(e)}), 500