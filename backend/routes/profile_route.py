
from flask import Blueprint, jsonify, request
import json
import os

profile_bp = Blueprint('profile', __name__)

# Get the absolute path to the data directory
data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
json_file_path = os.path.join(data_dir, 'userData.json')

@profile_bp.route('/profile', methods=['GET'])
def get_profile():
    try:
        with open(json_file_path, 'r') as file:
            user_data = json.load(file)
        return jsonify(user_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@profile_bp.route('/profile', methods=['POST'])
def update_profile():
    try:
        new_data = request.get_json()
        with open(json_file_path, 'w') as file:
            json.dump(new_data, file, indent=2)
        return jsonify({'message': 'Profile updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
