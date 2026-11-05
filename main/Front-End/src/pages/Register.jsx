// tela de cadastro de usuário
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  // envia o formulário de cadastro
  function handleSubmit(event) {
    event.preventDefault()

    // confere se as senhas são iguais
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }

    try {
      register({ name, email, password })
      navigate('/pacientes')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-center">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <h2>Criar conta</h2>
          <p className="muted">Preencha seus dados para acessar o sistema de triagem.</p>
        </div>
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
            placeholder="nome@exemplo.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="password">Senha</label>
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
        {/* aceite da LGPD */}
        <label className="checkbox-line">
          <input type="checkbox" required />
          Li e aceito o uso dos meus dados conforme a política de privacidade (LGPD).
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-block">Criar conta</button>
        <p className="auth-footer">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  )
}
