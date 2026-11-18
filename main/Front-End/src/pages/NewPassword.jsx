// tela de criar uma nova senha pelo link do e-mail
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { novaSenha } from '../services/api'

export default function NewPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // envia a nova senha para o back
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // confere se as senhas são iguais
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }

    try {
      await novaSenha(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
  }

  // sem token no endereço o link não serve
  if (!token) {
    return (
      <div className="auth-center">
        <div className="auth-form">
          <div>
            <h2>Nova senha</h2>
          </div>
          <p className="alert alert-error">Link inválido ou expirado.</p>
          <p className="auth-footer"><Link to="/login">← Voltar ao login</Link></p>
        </div>
      </div>
    )
  }

  // senha trocada, só falta entrar
  if (done) {
    return (
      <div className="auth-center">
        <div className="auth-form">
          <div>
            <h2>Nova senha</h2>
          </div>
          <p className="alert alert-success">Senha alterada! Agora você já pode entrar.</p>
          <p className="auth-footer"><Link to="/login">Ir para o login</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <h2>Nova senha</h2>
          <p className="muted">Escolha uma nova senha para acessar o sistema.</p>
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="password">Nova senha</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirmar senha</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              className="input"
              minLength={6}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-block">Salvar nova senha</button>
        <p className="auth-footer"><Link to="/login">← Voltar ao login</Link></p>
      </form>
    </div>
  )
}
