// funções que conversam com o back (main/Back-End), uma para cada rota do API.md

// faz a requisição e devolve o JSON; se der erro, lança a mensagem que o back mandou
async function chamar(metodo, caminho, corpo) {
  const opcoes = { method: metodo, headers: {} }
  if (corpo !== undefined) {
    opcoes.headers['Content-Type'] = 'application/json'
    opcoes.body = JSON.stringify(corpo)
  }

  const resposta = await fetch('/api' + caminho, opcoes)
  const dados = await resposta.json().catch(() => ({}))

  if (!resposta.ok) {
    const erro = new Error(dados.erro || 'Não foi possível falar com o servidor.')
    erro.status = resposta.status
    throw erro
  }
  return dados
}

// login, cadastro e senha
export function buscarSessao() {
  return chamar('GET', '/sessao')
}
export function entrar(email, senha) {
  return chamar('POST', '/login', { email, senha })
}
export function sair() {
  return chamar('POST', '/logout')
}
export function cadastrar(dados) {
  return chamar('POST', '/cadastro', dados)
}
export function confirmarEmail(token) {
  return chamar('POST', '/confirmar-email', { token })
}
export function esqueciSenha(email) {
  return chamar('POST', '/esqueci-senha', { email })
}
export function novaSenha(token, senha) {
  return chamar('POST', '/nova-senha', { token, senha })
}

// usuários (só admin)
export function listarUsuarios() {
  return chamar('GET', '/usuarios')
}
export function criarUsuario(dados) {
  return chamar('POST', '/usuarios', dados)
}
export function editarUsuario(id, dados) {
  return chamar('PUT', `/usuarios/${id}`, dados)
}
export function mudarAtivo(id, ativo) {
  return chamar('PATCH', `/usuarios/${id}/ativo`, { ativo })
}

// checklist de sintomas
export function buscarChecklist() {
  return chamar('GET', '/checklist')
}

// pacientes
export function listarPacientes() {
  return chamar('GET', '/pacientes')
}
export function buscarPaciente(id) {
  return chamar('GET', `/pacientes/${id}`)
}
export function criarPaciente(dados) {
  return chamar('POST', '/pacientes', dados)
}
export function editarPaciente(id, dados) {
  return chamar('PUT', `/pacientes/${id}`, dados)
}
export function excluirPaciente(id) {
  return chamar('DELETE', `/pacientes/${id}`)
}
export function salvarObservacoes(id, observacoes) {
  return chamar('PUT', `/pacientes/${id}/observacoes`, { observacoes })
}

// documentos do paciente
export function listarDocumentos(idPaciente) {
  return chamar('GET', `/pacientes/${idPaciente}/documentos`)
}
export async function enviarDocumento(idPaciente, arquivo) {
  // arquivo vai como formulário, não como JSON
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  const resposta = await fetch(`/api/pacientes/${idPaciente}/documentos`, { method: 'POST', body: formulario })
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível enviar o arquivo.')
  return dados
}
export function excluirDocumento(id) {
  return chamar('DELETE', `/documentos/${id}`)
}
export function linkDocumento(id) {
  return `/api/documentos/${id}`
}

// triagens
export function listarTriagens() {
  return chamar('GET', '/triagens')
}
export function listarTriagensDoPaciente(idPaciente) {
  return chamar('GET', `/pacientes/${idPaciente}/triagens`)
}
export function buscarTriagem(id) {
  return chamar('GET', `/triagens/${id}`)
}
export function criarTriagem(idPaciente, respostas) {
  return chamar('POST', '/triagens', { id_paciente: idPaciente, respostas })
}
export function editarTriagem(id, respostas) {
  return chamar('PUT', `/triagens/${id}`, { respostas })
}
export function excluirTriagem(id) {
  return chamar('DELETE', `/triagens/${id}`)
}
