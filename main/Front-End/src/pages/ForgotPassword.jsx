// tela de esqueci a senha (ainda não envia e-mail)
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)

  // mostra a mensagem de confirmação
  function handleSubmit(event) {
    event.preventDefault()
    setSent(true)
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
          <input id="email" name="email" type="email" className="input" placeholder="nome@exemplo.com" required />
        </div>
        <button className="btn btn-block">Enviar link de recuperação</button>
        {sent && <p className="alert alert-success">Se o e-mail estiver cadastrado, o link chegará em instantes.</p>}
        <p className="auth-footer"><Link to="/login">← Voltar ao login</Link></p>
      </form>
    </div>
  )
}
