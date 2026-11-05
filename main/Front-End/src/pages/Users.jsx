// tela de gerenciamento de usuários (só admin)
import { useState } from 'react'
import { listUsers, saveUser, toggleUser } from '../services/api'
import PageHeader from '../components/PageHeader'
import { ROLE_LABEL } from '../utils/format'

export default function Users() {
  // carrega a lista de usuários
  const [users, setUsers] = useState(listUsers)

  // usuário aberto no modal (null = modal fechado)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  // campos do formulário
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('professional')
  const [password, setPassword] = useState('')

  function refreshUsers() {
    setUsers(listUsers())
  }

  // abre o formulário para criar ou editar o usuário
  function openForm(user) {
    setError('')
    setName(user.name ?? '')
    setEmail(user.email ?? '')
    setRole(user.role ?? 'professional')
    // senha sempre começa vazia
    setPassword('')
    setEditing(user)
  }

  function closeForm() {
    setEditing(null)
  }

  // salva o usuário (cria ou atualiza)
  function handleSubmit(event) {
    event.preventDefault()
    try {
      saveUser({ name, email, role, password, id: editing.id })
      closeForm()
      refreshUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  // ativa ou desativa o usuário
  function handleToggle(id) {
    toggleUser(id)
    refreshUsers()
  }

  const isFormOpen = editing !== null
  const isEditingExistingUser = isFormOpen && Boolean(editing.id)

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
              const badgeTone = user.active ? 'success' : 'neutral'
              const statusText = user.active ? 'Ativo' : 'Inativo'
              const toggleText = user.active ? 'Desativar' : 'Ativar'

              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{ROLE_LABEL[user.role]}</td>
                  <td>
                    <span className={`badge badge-${badgeTone}`}>{statusText}</span>
                  </td>
                  <td className="actions">
                    <button className="link-btn" onClick={() => openForm(user)}>Editar</button>
                    <button className="link-btn" onClick={() => handleToggle(user.id)}>{toggleText}</button>
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
                <option value="professional">Profissional</option>
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
