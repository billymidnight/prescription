from flask import Blueprint, request, jsonify
import os
from werkzeug.utils import secure_filename
from supabase_client import get_admin_client

patient_bp = Blueprint('patients', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
SUPABASE_BUCKET = 'patient_images'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@patient_bp.route('/upload-image', methods=['POST'])
def upload_image():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        filename = request.form.get('filename', '')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Use provided filename or secure the original
        if filename:
            secure_name = secure_filename(filename)
        else:
            secure_name = secure_filename(file.filename)
        
        # Upload to Supabase Storage
        supabase = get_admin_client()
        if not supabase:
            return jsonify({'error': 'Supabase client not available'}), 500
        
        # Read file bytes
        file_bytes = file.read()
        
        # Upload to Supabase Storage bucket
        response = supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=secure_name,
            file=file_bytes,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )
        
        return jsonify({
            'success': True,
            'filename': secure_name,
            'message': 'Image uploaded successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_bp.route('/image/<filename>', methods=['GET'])
def get_image(filename):
    try:
        supabase = get_admin_client()
        if not supabase:
            return jsonify({'error': 'Supabase client not available'}), 500
        
        # Get public URL from Supabase Storage
        public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
        
        # Redirect to Supabase Storage URL
        from flask import redirect
        return redirect(public_url)
        
    except Exception as e:
        return jsonify({'error': 'Image not found'}), 404

@patient_bp.route('/update/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    # This endpoint is handled by Supabase directly from frontend
    # Keeping it here for consistency but not actively used
    return jsonify({'message': 'Use Supabase client for updates'}), 200

@patient_bp.route('/delete/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    # This endpoint is handled by Supabase directly from frontend
    # Keeping it here for consistency but not actively used
    return jsonify({'message': 'Use Supabase client for deletes'}), 200
