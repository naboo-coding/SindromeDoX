// tela que confirma o e-mail pelo link enviado no cadastro
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmarEmail } from '../services/api'

export default function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  // evita chamar o back duas vezes no modo de desenvolvimento
  const called = useRef(false)

  // manda o token para o back assim que a tela abre
  useEffect(() => {
    if (called.current) return
    called.current = true

    confirmarEmail(token)
      .then(() => setConfirmed(true))
      .catch((err) => setError(err.message))
  }, [token])

  return (
    <div className="auth-center">
      <div className="auth-form">
        <div>
          <h2>Confirmar e-mail</h2>
        </div>
        {!confirmed && !error && <p className="muted">Confirmando seu e-mail...</p>}
        {confirmed && <p className="alert alert-success">E-mail confirmado! Agora você já pode entrar.</p>}
        {error && <p className="alert alert-error">{error}</p>}
        {(confirmed || error) && <Link to="/login" className="btn btn-block">Ir para o login</Link>}
      </div>
    </div>
  )
}
