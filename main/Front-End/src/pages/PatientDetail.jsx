// detalhes do paciente e suas avaliações
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  addPatientDocument,
  canSee,
  deletePatient,
  deleteScreening,
  getPatient,
  listPatientScreenings,
  removePatientDocument,
  savePatientObservations,
} from '../services/api'
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

  // paciente inexistente ou de outro profissional volta para a lista
  if (!patient || !canSee(user, patient)) {
    return <Navigate to="/pacientes" replace />
  }

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

      <PatientNotes patient={patient} user={user} />

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

// tipos de arquivo aceitos e tamanho máximo (1 MB)
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']
const MAX_FILE_SIZE = 1024 * 1024

// confere a extensão do arquivo
function isAllowedFile(file) {
  const name = file.name.toLowerCase()
  return ALLOWED_EXTENSIONS.some((extension) => name.endsWith(extension))
}

// mostra o tamanho em KB
function formatSize(size) {
  return `${Math.ceil(size / 1024)} KB`
}

// observações e documentos anexados do paciente
function PatientNotes({ patient, user }) {
  const [observations, setObservations] = useState(patient.observations || '')
  const [documents, setDocuments] = useState(patient.documents || [])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // salva o texto das observações
  function handleSaveObservations() {
    savePatientObservations(patient.id, observations, user)
    setError('')
    setMessage('Observações salvas.')
  }

  // valida, lê e anexa o arquivo escolhido
  function handleFileChange(event) {
    const file = event.target.files[0]
    // limpa o campo para poder escolher o mesmo arquivo de novo
    event.target.value = ''
    if (!file) return
    setMessage('')
    setError('')

    if (!isAllowedFile(file)) {
      setError('Envie um arquivo PDF, DOC ou DOCX.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo passa de 1 MB.')
      return
    }

    const reader = new FileReader()
    // quando terminar de ler, salva o arquivo no paciente
    reader.onload = () => {
      try {
        addPatientDocument(patient.id, { name: file.name, size: file.size, dataUrl: reader.result }, user)
        setDocuments([...patient.documents])
        setMessage('Documento anexado.')
      } catch (err) {
        setError(err.message)
      }
    }
    reader.readAsDataURL(file)
  }

  // remove o documento depois de confirmar
  function handleRemoveDocument(doc) {
    if (!window.confirm(`Remover ${doc.name}?`)) return
    removePatientDocument(patient.id, doc.id, user)
    setDocuments([...patient.documents])
    setError('')
    setMessage('Documento removido.')
  }

  return (
    <>
      <h2 className="section-title section-gap">Observações e documentos</h2>
      <section className="card">
        <div className="field">
          <label htmlFor="patient-observations">Observações</label>
          <textarea
            id="patient-observations"
            className="input"
            rows={3}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </div>
        <div className="notes-actions">
          <button className="btn btn-outline" onClick={handleSaveObservations}>Salvar observações</button>
        </div>

        <h3 className="section-subtitle">Documentos</h3>
        {documents.length === 0 && <p className="muted small">Nenhum documento anexado.</p>}
        <ul className="document-list">
          {documents.map((doc) => (
            <li key={doc.id}>
              <div>
                <a href={doc.dataUrl} download={doc.name}>{doc.name}</a>
                <p className="muted small">{formatSize(doc.size)} · {formatDate(doc.date)} · {doc.uploadedBy}</p>
              </div>
              <button className="link-btn link-danger" onClick={() => handleRemoveDocument(doc)}>Remover</button>
            </li>
          ))}
        </ul>

        <div className="document-upload">
          <label htmlFor="patient-document" className="btn btn-outline">Anexar documento</label>
          <input id="patient-document" type="file" accept=".pdf,.doc,.docx" hidden onChange={handleFileChange} />
          <span className="muted small">PDF, DOC ou DOCX, até 1 MB</span>
        </div>

        {error && <p className="alert alert-error">{error}</p>}
        {message && <p className="alert alert-success">{message}</p>}
      </section>
    </>
  )
}
