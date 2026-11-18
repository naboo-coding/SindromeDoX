// componentes usados em várias telas: menu lateral, cabeçalho e etiqueta de status
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ROLE_LABEL, STATUS } from './utils'
import logo from './assets/logo-instituto.png'

// menu lateral e área das páginas
export function Layout() {
  const { usuario, logout } = useAuth()

  // link de usuários só aparece para admin
  const isAdmin = usuario.perfil === 'admin'

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>Triagem X Frágil</strong>
          <img src={logo} alt="Instituto Buko Kaesemodel" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/pacientes">Pacientes</NavLink>
          <NavLink to="/triagem">Nova triagem</NavLink>
          <NavLink to="/historico">Histórico</NavLink>
          {isAdmin && <NavLink to="/usuarios">Usuários</NavLink>}
        </nav>
        <div className="sidebar-user">
          <strong>{usuario.nome}</strong>
          <span>{ROLE_LABEL[usuario.perfil]}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

// cabeçalho das páginas internas
export function PageHeader({ crumbs, title, subtitle, children }) {
  // monta a trilha começando em "Início"
  const breadcrumbText = ['Início', ...crumbs].join(' / ')

  return (
    <header className="page-header">
      <div>
        <p className="breadcrumb">{breadcrumbText}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {children}
    </header>
  )
}

// etiqueta com o resultado da triagem (status vem do back: pendente, atingido ou nao_atingido)
export function StatusBadge({ status }) {
  const info = STATUS[status]
  return <span className={`badge badge-${info.tone}`}>{info.label}</span>
}
