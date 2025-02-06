from flask import Flask
from flask_cors import CORS
from routes.currency_route import currency_bp
from routes.person_route import person_bp
from routes.object_route import object_bp

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Register individual route blueprints
app.register_blueprint(currency_bp, url_prefix='/api')
app.register_blueprint(person_bp, url_prefix='/api')
app.register_blueprint(object_bp, url_prefix='/api')

if __name__ == '__main__':
    app.run(debug=True, port=5000)