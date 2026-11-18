// histórico de triagens com filtros
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listarTriagens } from '../services/api'
import { PageHeader, StatusBadge } from '../components'
import { formatDate, formatScore, includesText } from '../utils'

const DAY_MS = 24 * 60 * 60 * 1000

export default function History() {
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  const [allScreenings, setAllScreenings] = useState(null)
  const [search, setSearch] = useState(params.get('busca') || '')
  const [days, setDays] = useState('')
  const [status, setStatus] = useState('')
  const [professional, setProfessional] = useState('')
  const isAdmin = usuario.perfil === 'admin'

  // carrega as triagens do back
  useEffect(() => {
    listarTriagens().then((dados) => setAllScreenings(dados))
  }, [])

  // espera os dados chegarem
  if (!allScreenings) {
    return null
  }

  // data inicial do período em AAAA-MM-DD
  let cutoffDate = ''
  if (days) {
    cutoffDate = new Date(Date.now() - days * DAY_MS).toLocaleDateString('sv')
  }

  // nomes de quem aplicou as triagens, sem repetir
  const professionals = [...new Set(allScreenings.map((screening) => screening.aplicada_por))]

  // filtra por busca, período, resultado e profissional
  function matchesFilters(screening) {
    const matchesSearch = includesText(screening.paciente.nome, search)
    const matchesPeriod = !cutoffDate || screening.hora_triagem.slice(0, 10) >= cutoffDate
    const matchesStatus = !status || screening.status === status
    const matchesProfessional = !professional || screening.aplicada_por === professional
    return matchesSearch && matchesPeriod && matchesStatus && matchesProfessional
  }

  const screenings = allScreenings.filter(matchesFilters)

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
          <option value="atingido">Critério atingido</option>
          <option value="nao_atingido">Critério não atingido</option>
          <option value="pendente">Cálculo pendente</option>
        </select>
        {isAdmin && (
          <select className="input" value={professional} onChange={(e) => setProfessional(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {professionals.map((name) => <option key={name} value={name}>{name}</option>)}
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
              <tr key={screening.id_triagem}>
                <td>{screening.paciente.nome}</td>
                <td>{formatDate(screening.hora_triagem)}</td>
                <td>{screening.aplicada_por}</td>
                <td>{formatScore(screening.pontuacao)}</td>
                <td><StatusBadge status={screening.status} /></td>
                <td className="actions">
                  <Link to={`/triagens/${screening.id_triagem}`}>Visualizar</Link>
                  {/* abre o resultado já na tela de impressão */}
                  <Link to={`/triagens/${screening.id_triagem}?imprimir`}>Imprimir</Link>
                  <Link to={`/triagens/${screening.id_triagem}?imprimir`}>Baixar</Link>
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
