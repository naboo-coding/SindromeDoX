// tela de cadastro do responsável
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cadastrar } from '../services/api'
import { CPF_PATTERN, PHONE_PATTERN, maskCpf, maskPhone, onlyDigits } from '../utils'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [aceite, setAceite] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  // envia o cadastro para o back
  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    // confere se as senhas são iguais
    if (password !== confirm) {
      setError('As senhas não conferem.')
      return
    }

    try {
      await cadastrar({
        nome: name,
        email,
        senha: password,
        cpf: onlyDigits(cpf),
        telefone: onlyDigits(telefone),
        aceite_termos: aceite,
      })
      setDone(true)
    } catch (err) {
      setError(err.message)
    }
  }

  // depois do cadastro mostra o aviso de confirmação do e-mail
  if (done) {
    return (
      <div className="auth-center">
        <div className="auth-form">
          <div>
            <h2>Criar conta</h2>
          </div>
          <p className="alert alert-success">Cadastro feito! Enviamos um link de confirmação para o seu e-mail. Confirme para poder entrar.</p>
          <p className="auth-footer"><Link to="/login">Ir para o login</Link></p>
        </div>
      </div>
    )
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
            <label htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              name="cpf"
              className="input"
              placeholder="000.000.000-00"
              required
              inputMode="numeric"
              pattern={CPF_PATTERN}
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
            />
          </div>
          <div className="field">
            <label htmlFor="telefone">Telefone</label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              className="input"
              required
              pattern={PHONE_PATTERN}
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
            />
          </div>
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
          <input type="checkbox" required checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          Li e aceito o uso dos meus dados conforme a política de privacidade (LGPD).
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button className="btn btn-block">Criar conta</button>
        <p className="auth-footer">Já tem conta? <Link to="/login">Entrar</Link></p>
      </form>
    </div>
  )
}
