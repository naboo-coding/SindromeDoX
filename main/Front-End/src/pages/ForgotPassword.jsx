// tela de esqueci a senha
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { esqueciSenha } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // pede o link ao back e mostra a mensagem de confirmação
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      await esqueciSenha(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <h2>Esqueci a senha</h2>
          <p className="muted">Informe seu e-mail e enviaremos um link para você criar uma nova senha.</p>
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            placeholder="nome@exemplo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <button className="btn btn-block">Enviar link de recuperação</button>
        {sent && <p className="alert alert-success">Se o e-mail estiver cadastrado, o link chegará em instantes.</p>}
        {error && <p className="alert alert-error">{error}</p>}
        <p className="auth-footer"><Link to="/login">← Voltar ao login</Link></p>
      </form>
    </div>
  )
}
