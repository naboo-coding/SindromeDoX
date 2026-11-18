"""Rotas dos documentos dos pacientes: enviar, listar, baixar e desativar."""
import io
import os
import uuid
import zipfile

from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename

import auditoria
from config import Config
from database import consultar_todos, consultar_um, executar, inserir, transacao
from seguranca import buscar_paciente_visivel, login_obrigatorio

bp = Blueprint("documentos", __name__)

# Tamanho máximo de um documento: 10 MB.
TAMANHO_MAXIMO = 10485760

# Consulta base dos documentos, com o nome de quem enviou.
SQL_DOCUMENTO = """
    SELECT d.id_documento, d.nome_arquivo, d.tipo_mime, d.tamanho_bytes, d.enviado_em,
           u.nome AS enviado_por
    FROM documento_paciente d
    JOIN usuario u ON u.id_usuario = d.id_usuario_envio
    WHERE d.ativo = TRUE
"""


# Monto o documento no formato que a API devolve.
def _documento_json(linha):
    return {
        "id_documento": linha["id_documento"],
        "nome_arquivo": linha["nome_arquivo"],
        "tipo_mime": linha["tipo_mime"],
        "tamanho_bytes": linha["tamanho_bytes"],
        "enviado_em": linha["enviado_em"].strftime("%Y-%m-%d %H:%M:%S"),
        "enviado_por": linha["enviado_por"],
    }


# Descubro o tipo pelo conteúdo (os primeiros bytes), não pela extensão.
# Devolvo (tipo_mime, extensão) ou (None, None) se o tipo não for aceito.
def _detectar_tipo(conteudo):
    if conteudo.startswith(b"%PDF"):
        return "application/pdf", ".pdf"
    if conteudo.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if conteudo.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if conteudo.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"):
        return "application/msword", ".doc"

    # O DOCX é um zip que tem o arquivo word/document.xml dentro.
    if conteudo.startswith(b"PK\x03\x04"):
        try:
            with zipfile.ZipFile(io.BytesIO(conteudo)) as arquivo_zip:
                if "word/document.xml" in arquivo_zip.namelist():
                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"
        except zipfile.BadZipFile:
            pass

    return None, None


@bp.get("/api/pacientes/<int:id_paciente>/documentos")
@login_obrigatorio()
def listar(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    linhas = consultar_todos(
        SQL_DOCUMENTO + " AND d.id_paciente = %s ORDER BY d.enviado_em DESC, d.id_documento DESC",
        (id_paciente,),
    )
    return jsonify([_documento_json(linha) for linha in linhas])


@bp.post("/api/pacientes/<int:id_paciente>/documentos")
@login_obrigatorio()
def enviar(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    arquivo = request.files.get("arquivo")
    if arquivo is None or not arquivo.filename:
        return jsonify(erro="Envie um arquivo no campo arquivo."), 400

    # Guardo o nome original só para exibir; tiro um caminho que o navegador possa ter mandado.
    nome_arquivo = os.path.basename(arquivo.filename.replace("\\", "/")).strip()[:255]
    if not secure_filename(nome_arquivo):
        return jsonify(erro="Nome de arquivo inválido."), 400

    conteudo = arquivo.read()
    if len(conteudo) == 0:
        return jsonify(erro="O arquivo está vazio."), 400
    if len(conteudo) > TAMANHO_MAXIMO:
        return jsonify(erro="O arquivo pode ter no máximo 10 MB."), 400

    tipo_mime, extensao = _detectar_tipo(conteudo)
    if tipo_mime is None:
        return jsonify(erro="Envie um arquivo PDF, DOC, DOCX, JPG ou PNG."), 400

    # Salvo no disco com um nome aleatório, para não usar o nome enviado.
    os.makedirs(Config.UPLOAD_DIR, exist_ok=True)
    nome_no_disco = uuid.uuid4().hex + extensao
    with open(os.path.join(Config.UPLOAD_DIR, nome_no_disco), "wb") as destino:
        destino.write(conteudo)

    with transacao() as con:
        id_documento = inserir(
            "INSERT INTO documento_paciente "
            "(id_paciente, nome_arquivo, tipo_mime, tamanho_bytes, caminho_arquivo, id_usuario_envio) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (id_paciente, nome_arquivo, tipo_mime, len(conteudo), nome_no_disco, usuario["id_usuario"]),
            con,
        )
        auditoria.registrar(
            "documento.enviar", "documento_paciente", id_documento,
            depois={"id_paciente": id_paciente, "nome_arquivo": nome_arquivo,
                    "tipo_mime": tipo_mime, "tamanho_bytes": len(conteudo)},
            con=con,
        )

    linha = consultar_um(SQL_DOCUMENTO + " AND d.id_documento = %s", (id_documento,))
    return jsonify(_documento_json(linha)), 201


@bp.get("/api/documentos/<int:id_documento>")
@login_obrigatorio()
def baixar(usuario, id_documento):
    documento = consultar_um(
        "SELECT * FROM documento_paciente WHERE id_documento = %s AND ativo = TRUE", (id_documento,)
    )
    if documento is None:
        return jsonify(erro="Documento não encontrado."), 404

    paciente, erro = buscar_paciente_visivel(usuario, documento["id_paciente"])
    if erro:
        return erro

    caminho = os.path.join(Config.UPLOAD_DIR, documento["caminho_arquivo"])
    if not os.path.isfile(caminho):
        return jsonify(erro="Arquivo não encontrado no servidor."), 404

    return send_file(
        caminho,
        as_attachment=True,
        download_name=documento["nome_arquivo"],
        mimetype=documento["tipo_mime"],
    )


@bp.delete("/api/documentos/<int:id_documento>")
@login_obrigatorio()
def excluir(usuario, id_documento):
    documento = consultar_um(
        "SELECT id_paciente FROM documento_paciente WHERE id_documento = %s AND ativo = TRUE",
        (id_documento,),
    )
    if documento is None:
        return jsonify(erro="Documento não encontrado."), 404

    paciente, erro = buscar_paciente_visivel(usuario, documento["id_paciente"])
    if erro:
        return erro

    # O arquivo continua no disco; só desativo o registro.
    with transacao() as con:
        executar("UPDATE documento_paciente SET ativo = FALSE WHERE id_documento = %s", (id_documento,), con)
        auditoria.registrar("documento.excluir", "documento_paciente", id_documento, con=con)

    return jsonify(mensagem="Documento excluído.")
