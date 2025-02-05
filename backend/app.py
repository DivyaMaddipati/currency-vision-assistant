from flask import Flask
from flask_cors import CORS
from routes.currency_route import currency_bp
from routes.person_route import person_bp
from routes.object_route import object_bp

app = Flask(__name__)
CORS(app)

# Register individual route blueprints
app.register_blueprint(currency_bp)
app.register_blueprint(person_bp)
app.register_blueprint(object_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)