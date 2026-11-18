// lista de pacientes com busca, filtro e paginação
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarPacientes } from '../services/api'
import { PageHeader, StatusBadge } from '../components'
import { formatDate, formatScore, includesText } from '../utils'

const PAGE_SIZE = 5

export default function Patients() {
  const [allPatients, setAllPatients] = useState([])
  const [search, setSearch] = useState('')
  const [order, setOrder] = useState('desc')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  // carrega os pacientes do back
  useEffect(() => {
    listarPacientes().then(setAllPatients)
  }, [])

  function matchesSearch(patient) {
    // cpf é o do responsável
    const cpf = patient.responsavel?.cpf ?? ''
    return includesText(patient.nome, search) || includesText(cpf, search)
  }

  function matchesStatus(patient) {
    if (!status) return true
    // sem triagem não tem resultado
    if (!patient.ultima_triagem) return false
    return patient.ultima_triagem.status === status
  }

  function compareByLastScreening(a, b) {
    // sem triagem usa data vazia
    const dateA = a.ultima_triagem?.hora_triagem ?? ''
    const dateB = b.ultima_triagem?.hora_triagem ?? ''
    const difference = dateA.localeCompare(dateB)
    return order === 'desc' ? -difference : difference
  }

  // busca, filtra e ordena
  const searchedPatients = allPatients.filter(matchesSearch)
  const filteredPatients = searchedPatients.filter(matchesStatus)
  const patients = filteredPatients.sort(compareByLastScreening)

  // paginação, com no mínimo uma página
  const pageCount = Math.max(1, Math.ceil(patients.length / PAGE_SIZE))
  const start = (page - 1) * PAGE_SIZE
  const visible = patients.slice(start, start + PAGE_SIZE)
  const firstShown = patients.length ? start + 1 : 0
  const lastShown = start + visible.length
  const pageNumbers = Array.from({ length: pageCount }, (_, index) => index + 1)

  // mudar busca, ordem ou filtro volta para a página 1
  function handleSearchChange(event) {
    setSearch(event.target.value)
    setPage(1)
  }

  function handleOrderChange(event) {
    setOrder(event.target.value)
    setPage(1)
  }

  function handleStatusChange(event) {
    setStatus(event.target.value)
    setPage(1)
  }

  return (
    <>
      <PageHeader crumbs={['Pacientes']} title="Pacientes">
        <Link to="/pacientes/novo" className="btn">+ Novo paciente</Link>
      </PageHeader>

      <div className="toolbar">
        <input className="input" placeholder="Buscar por nome ou CPF" value={search} onChange={handleSearchChange} />
        <select className="input" value={order} onChange={handleOrderChange}>
          <option value="desc">Triagem mais recente</option>
          <option value="asc">Triagem mais antiga</option>
        </select>
        <select className="input" value={status} onChange={handleStatusChange}>
          <option value="">Todos os resultados</option>
          <option value="atingido">Critério atingido</option>
          <option value="nao_atingido">Critério não atingido</option>
          <option value="pendente">Cálculo pendente</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Data de nascimento</th>
              <th>Última triagem</th>
              <th>Resultado / Pontuação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((patient) => (
              <tr key={patient.id_paciente}>
                <td>{patient.nome}</td>
                <td>{formatDate(patient.data_nascimento)}</td>
                <td>{patient.ultima_triagem ? formatDate(patient.ultima_triagem.hora_triagem) : '—'}</td>
                <td>
                  {patient.ultima_triagem ? (
                    <span className="status">
                      <StatusBadge status={patient.ultima_triagem.status} /> {formatScore(patient.ultima_triagem.pontuacao)}
                    </span>
                  ) : (
                    <span className="muted">Sem triagem</span>
                  )}
                </td>
                <td className="actions">
                  <Link to={`/pacientes/${patient.id_paciente}`}>Ver</Link>
                  <Link to={`/triagem?paciente=${patient.id_paciente}`}>Nova triagem</Link>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">Nenhum paciente encontrado. Ajuste a busca ou cadastre um novo paciente.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>
          Mostrando {firstShown}–{lastShown} de {patients.length} pacientes
        </span>
        <nav className="pagination">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>‹ Anterior</button>
          {pageNumbers.map((number) => (
            <button key={number} aria-current={number === page ? 'page' : undefined} onClick={() => setPage(number)}>{number}</button>
          ))}
          <button disabled={page === pageCount} onClick={() => setPage(page + 1)}>Próxima ›</button>
        </nav>
      </div>
    </>
  )
}
