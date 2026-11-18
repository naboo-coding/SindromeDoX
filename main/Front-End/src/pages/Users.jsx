// tela de gerenciamento de usuários (só admin)
import { useEffect, useState } from 'react'
import { criarUsuario, editarUsuario, listarUsuarios, mudarAtivo } from '../services/api'
import { PageHeader } from '../components'
import { ROLE_LABEL } from '../utils'

export default function Users() {
  const [users, setUsers] = useState([])

  // usuário aberto no modal (null = modal fechado)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  // campos do formulário
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('profissional')
  const [password, setPassword] = useState('')

  // carrega os usuários do back
  function refreshUsers() {
    listarUsuarios()
      .then((dados) => setUsers(dados))
      .catch((err) => alert(err.message))
  }

  // busca a lista quando a tela abre
  useEffect(() => {
    refreshUsers()
  }, [])

  // abre o formulário para criar ou editar o usuário
  function openForm(user) {
    setError('')
    setName(user.nome ?? '')
    setEmail(user.email ?? '')
    setRole(user.perfil ?? 'profissional')
    // senha sempre começa vazia
    setPassword('')
    setEditing(user)
  }

  function closeForm() {
    setEditing(null)
  }

  // salva o usuário no back (cria ou atualiza)
  async function handleSubmit(event) {
    event.preventDefault()
    const dados = { nome: name, email, perfil: role, senha: password }
    try {
      if (editing.id_usuario) {
        await editarUsuario(editing.id_usuario, dados)
      } else {
        await criarUsuario(dados)
      }
      closeForm()
      refreshUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  // ativa ou desativa o usuário
  function handleToggle(user) {
    mudarAtivo(user.id_usuario, !user.ativo)
      .then(() => refreshUsers())
      .catch((err) => alert(err.message))
  }

  const isFormOpen = editing !== null
  const isEditingExistingUser = isFormOpen && Boolean(editing.id_usuario)

  const formTitle = isEditingExistingUser ? 'Editar usuário' : 'Novo usuário'
  const passwordLabel = isEditingExistingUser ? 'Nova senha (opcional)' : 'Senha provisória'
  const submitLabel = isEditingExistingUser ? 'Salvar alterações' : 'Cadastrar usuário'

  return (
    <>
      <PageHeader crumbs={['Usuários']} title="Gerenciamento de usuários">
        <button className="btn" onClick={() => openForm({})}>+ Novo usuário</button>
      </PageHeader>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const badgeTone = user.ativo ? 'success' : 'neutral'
              const statusText = user.ativo ? 'Ativo' : 'Inativo'
              const toggleText = user.ativo ? 'Desativar' : 'Ativar'

              return (
                <tr key={user.id_usuario}>
                  <td>{user.nome}</td>
                  <td>{user.email}</td>
                  <td>{ROLE_LABEL[user.perfil]}</td>
                  <td>
                    <span className={`badge badge-${badgeTone}`}>{statusText}</span>
                  </td>
                  <td className="actions">
                    <button className="link-btn" onClick={() => openForm(user)}>Editar</button>
                    <button className="link-btn" onClick={() => handleToggle(user)}>{toggleText}</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="hint">Perfis seguem o princípio do menor privilégio: profissionais acessam apenas seus pacientes; administradores gerenciam usuários e todos os relatórios.</p>

      {isFormOpen && (
        // clicar fora fecha o modal
        <div className="modal-overlay" onClick={closeForm}>
          {/* clicar dentro do formulário não fecha o modal */}
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
            <h2>{formTitle}</h2>
            <div className="field">
              <label htmlFor="name">Nome completo</label>
              <input
                id="name"
                name="name"
                className="input"
                placeholder="Ex.: Ana Pereira"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                placeholder="nome@institutobuko.org"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="role">Perfil</label>
              <select id="role" name="role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                {/* responsável se cadastra sozinho, então só aparece ao editar */}
                {isEditingExistingUser && <option value="responsavel">Responsável</option>}
                <option value="profissional">Profissional</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="password">{passwordLabel}</label>
              {/* senha só é obrigatória para usuário novo */}
              <input
                id="password"
                name="password"
                type="password"
                className="input"
                minLength={6}
                required={!isEditingExistingUser}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="alert alert-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={closeForm}>Cancelar</button>
              <button className="btn">{submitLabel}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
