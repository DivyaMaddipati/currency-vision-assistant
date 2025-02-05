from flask import Flask
from flask_cors import CORS
from routes import detection, speech

app = Flask(__name__)
CORS(app)

# Register routes
app.register_blueprint(detection.bp)
app.register_blueprint(speech.bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)