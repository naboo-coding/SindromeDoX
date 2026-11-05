// tela de login
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // faz o login e abre a lista de pacientes
  function handleSubmit(event) {
    event.preventDefault()
    try {
      login(email, password)
      navigate('/pacientes')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-split">
      <section className="auth-hero">
        <span>Instituto Buko Kaesemodel</span>
        <h1>Triagem da Síndrome do X Frágil</h1>
        <p>Uma avaliação simples e acolhedora para identificar quem pode receber o auxílio do instituto para o teste genético.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <h2>Entrar</h2>
            <p className="muted">Acesse com seu e-mail e senha.</p>
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
          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Link to="/esqueci-senha" className="small">Esqueci minha senha</Link>
          {error && <p className="alert alert-error">{error}</p>}
          <button className="btn btn-block">Entrar</button>
          <p className="auth-footer">Não tem conta? <Link to="/cadastro">Cadastre-se</Link></p>
        </form>
      </section>
    </div>
  )
}
