from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from routes.acompanhamento import bp as acompanhamento_bp
from routes.autenticacao import bp as autenticacao_bp
from routes.checklist import bp as checklist_bp
from routes.documentos import bp as documentos_bp
from routes.pacientes import bp as pacientes_bp
from routes.saude import bp as saude_bp
from routes.triagens import bp as triagens_bp
from routes.usuarios import bp as usuarios_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Limite de tamanho das requisições (documentos de até 10 MB, com folga).
    app.config["MAX_CONTENT_LENGTH"] = 11 * 1024 * 1024

    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

    # Cada grupo de rotas fica em um arquivo da pasta routes/.
    app.register_blueprint(saude_bp)
    app.register_blueprint(autenticacao_bp)
    app.register_blueprint(usuarios_bp)
    app.register_blueprint(checklist_bp)
    app.register_blueprint(pacientes_bp)
    app.register_blueprint(documentos_bp)
    app.register_blueprint(triagens_bp)
    app.register_blueprint(acompanhamento_bp)

    # Arquivo maior que o limite volta como JSON, igual aos outros erros.
    @app.errorhandler(413)
    def arquivo_grande(erro):
        return jsonify(erro="O arquivo passa de 10 MB."), 413

    return app

app = create_app()

if __name__ == "__main__":
    # Servidor de desenvolvimento
    app.run(host="127.0.0.1", port=5000, debug=Config.DEBUG)
