from flask import Flask
from flask_cors import CORS
from config import Config
from routes.saude import bp as saude_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=Config.CORS_ORIGINS)
    app.register_blueprint(saude_bp)
    return app

app = create_app()

if __name__ == "__main__":
    # Servidor de desenvolvimento
    app.run(host="127.0.0.1", port=5000, debug=Config.DEBUG)
