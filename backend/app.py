import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Get allowed origins from environment or use defaults
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:5173').split(',')
    
    # Configure CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type", 
                "Authorization", 
                "X-User-Email", 
                "X-User-Name", 
                "X-User-Role"
            ],
            "supports_credentials": True
        },
        r"/static_images/*": {
            "origins": allowed_origins,
            "methods": ["GET", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True
        }
    })

    # Register API blueprints
    from api.routes import api_bp
    from api.patient_routes import patient_bp
    app.register_blueprint(api_bp)
    app.register_blueprint(patient_bp, url_prefix='/api/patients')

    # Static images endpoint
    @app.route('/static_images/<path:filename>')
    def serve_static_image(filename):
        static_images_path = os.path.join(os.path.dirname(__file__), 'static_images')
        return send_from_directory(static_images_path, filename)

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "ok", "message": "Medicare Clinic API is running"})

    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 4000))
    app.run(host='0.0.0.0', port=port, debug=True)

# Expose app for gunicorn
app = create_app()
