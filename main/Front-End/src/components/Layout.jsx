// menu lateral e área das páginas
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABEL } from '../utils/format'
import logo from '../assets/logo-instituto.png'

export default function Layout() {
  const { user, logout } = useAuth()

  // link de usuários só aparece para admin
  const isAdmin = user.role === 'admin'

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
          <strong>{user.name}</strong>
          <span>{ROLE_LABEL[user.role]}</span>
          <button onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
