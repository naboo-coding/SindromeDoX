// detalhes do paciente e suas avaliações
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deletePatient, deleteScreening, getPatient, listPatientScreenings } from '../services/api'
import { CONTACT_FIELDS, PERSONAL_FIELDS } from '../data/patientFields'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { SEX_LABEL, age, formatDate, formatScore } from '../utils/format'

// mesmos campos do formulário
const ALL_FIELDS = [...PERSONAL_FIELDS, ...CONTACT_FIELDS]

// formata o valor para exibir
function displayValue(field, value) {
  if (!value) return '—'
  if (field.type === 'date') return formatDate(value)
  if (field.options) {
    // mostra o texto da opção
    const option = field.options.find(([optionValue]) => optionValue === value)
    return option[1]
  }
  return value
}

export default function PatientDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  // avaliações do paciente
  const [screenings, setScreenings] = useState(() => listPatientScreenings(id))
  const patient = getPatient(id)
  // só admin pode editar e excluir
  const isAdmin = user.role === 'admin'

  // exclui o paciente e volta para a lista
  function handleDeletePatient() {
    if (!window.confirm(`Excluir ${patient.name} e todas as avaliações?`)) return
    deletePatient(id, user)
    navigate('/pacientes')
  }

  // exclui a avaliação e atualiza a tabela
  function handleDeleteScreening(screeningId) {
    if (!window.confirm('Excluir esta avaliação?')) return
    deleteScreening(screeningId, user)
    setScreenings(listPatientScreenings(id))
  }

  const subtitle = `${age(patient.birthDate)} anos · ${SEX_LABEL[patient.sex]}`

  return (
    <>
      <PageHeader crumbs={['Pacientes', patient.name]} title={patient.name} subtitle={subtitle}>
        <div className="header-actions">
          {isAdmin && <button className="btn btn-outline btn-danger" onClick={handleDeletePatient}>Excluir</button>}
          {isAdmin && <Link to={`/pacientes/${id}/editar`} className="btn btn-outline">Editar cadastro</Link>}
          <Link to={`/triagem?paciente=${id}`} className="btn">Nova triagem</Link>
        </div>
      </PageHeader>

      <section className="card">
        <h2 className="section-title">Dados cadastrais</h2>
        <dl className="detail-grid">
          {ALL_FIELDS.map((field) => (
            <div key={field.name}>
              <dt>{field.label}</dt>
              <dd>{displayValue(field, patient[field.name])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <h2 className="section-title section-gap">Avaliações</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
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
                <td>{formatDate(screening.date)}</td>
                <td>{screening.professional}</td>
                <td>{formatScore(screening.score)}</td>
                <td><StatusBadge screening={screening} /></td>
                <td className="actions">
                  <Link to={`/triagens/${screening.id}`}>Ver</Link>
                  {isAdmin && <Link to={`/triagem?avaliacao=${screening.id}`}>Editar</Link>}
                  {isAdmin && <button className="link-btn link-danger" onClick={() => handleDeleteScreening(screening.id)}>Excluir</button>}
                </td>
              </tr>
            ))}
            {screenings.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">Nenhuma avaliação registrada. Use “Nova triagem” para começar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
