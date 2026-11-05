// histórico de triagens com filtros
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listScreenings, listUsers } from '../services/api'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatScore, includesText } from '../utils/format'
import { screeningStatus } from '../utils/score'

const DAY_MS = 24 * 60 * 60 * 1000

export default function History() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [search, setSearch] = useState(params.get('busca') || '')
  const [days, setDays] = useState('')
  const [status, setStatus] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const isAdmin = user.role === 'admin'

  // data inicial do período em AAAA-MM-DD
  let cutoffDate = ''
  if (days) {
    cutoffDate = new Date(Date.now() - days * DAY_MS).toLocaleDateString('sv')
  }

  // filtra por busca, período, resultado e profissional
  function matchesFilters(screening) {
    const matchesSearch = includesText(screening.patient.name, search)
    const matchesPeriod = !cutoffDate || screening.date >= cutoffDate
    const matchesStatus = !status || screeningStatus(screening) === status
    const matchesProfessional = !professionalId || screening.professionalId === professionalId
    return matchesSearch && matchesPeriod && matchesStatus && matchesProfessional
  }

  const screenings = listScreenings(user).filter(matchesFilters)

  return (
    <>
      <PageHeader crumbs={['Histórico']} title="Histórico de relatórios" />

      <div className="toolbar">
        <input className="input" placeholder="Buscar por paciente" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="">Todo o período</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Últimos 12 meses</option>
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os resultados</option>
          <option value="met">Critério atingido</option>
          <option value="notMet">Critério não atingido</option>
          <option value="pending">Cálculo pendente</option>
        </select>
        {isAdmin && (
          <select className="input" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {listUsers().map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
          </select>
        )}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Data</th>
              <th>Profissional</th>
              <th>Pontuação</th>
              <th>Resultado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {screenings.map((screening) => (
              <tr key={screening.id}>
                <td>{screening.patient.name}</td>
                <td>{formatDate(screening.date)}</td>
                <td>{screening.professional}</td>
                <td>{formatScore(screening.score)}</td>
                <td><StatusBadge screening={screening} /></td>
                <td className="actions">
                  <Link to={`/triagens/${screening.id}`}>Visualizar</Link>
                  {/* abre o resultado já na tela de impressão */}
                  <Link to={`/triagens/${screening.id}?imprimir`}>Imprimir</Link>
                  <Link to={`/triagens/${screening.id}?imprimir`}>Baixar</Link>
                </td>
              </tr>
            ))}
            {screenings.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">Nenhum relatório encontrado. Ajuste a busca ou os filtros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
