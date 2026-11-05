// rotas da aplicação
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import Register from './pages/Register'
import Patients from './pages/Patients'
import PatientForm from './pages/PatientForm'
import PatientDetail from './pages/PatientDetail'
import Screening from './pages/Screening'
import Result from './pages/Result'
import History from './pages/History'
import Users from './pages/Users'

// bloqueia rotas para quem não está logado ou não é admin
function Private({ adminOnly }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/pacientes" replace />
  return <Layout />
}

export default function App() {
  return (
    <Routes>
      {/* rotas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/esqueci-senha" element={<ForgotPassword />} />
      <Route path="/cadastro" element={<Register />} />

      {/* rotas para usuários logados */}
      <Route element={<Private />}>
        <Route path="/pacientes" element={<Patients />} />
        <Route path="/pacientes/novo" element={<PatientForm />} />
        <Route path="/pacientes/:id" element={<PatientDetail />} />
        <Route path="/triagem" element={<Screening />} />
        <Route path="/triagens/:id" element={<Result />} />
        <Route path="/historico" element={<History />} />
      </Route>

      {/* rotas só para admin */}
      <Route element={<Private adminOnly />}>
        <Route path="/usuarios" element={<Users />} />
        <Route path="/pacientes/:id/editar" element={<PatientForm />} />
      </Route>

      {/* endereço desconhecido vai para pacientes */}
      <Route path="*" element={<Navigate to="/pacientes" replace />} />
    </Routes>
  )
}
