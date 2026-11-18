// detalhes do paciente e suas avaliações
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  buscarPaciente,
  enviarDocumento,
  excluirDocumento,
  excluirPaciente,
  excluirTriagem,
  linkDocumento,
  listarDocumentos,
  listarTriagensDoPaciente,
  salvarObservacoes,
} from '../services/api'
import { CONTACT_FIELDS, PERSONAL_FIELDS, RESPONSAVEL_FIELDS } from '../data'
import { PageHeader, StatusBadge } from '../components'
import { SEX_LABEL, age, formatContact, formatDate, formatScore } from '../utils'

// mesmos campos do formulário
const ALL_FIELDS = [...PERSONAL_FIELDS, ...CONTACT_FIELDS]

// pega o valor no paciente ou no responsável
function fieldValue(patient, name) {
  const responsavelKey = RESPONSAVEL_FIELDS[name]
  if (responsavelKey) return patient.responsavel?.[responsavelKey]
  return patient[name]
}

// formata o valor para exibir
function displayValue(field, value) {
  if (!value) return '—'
  if (field.type === 'date') return formatDate(value)
  if (field.name === 'sexo_biologico') return SEX_LABEL[value]
  return formatContact(field.name, value)
}

export default function PatientDetail() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  // avaliações do paciente
  const [screenings, setScreenings] = useState([])
  // só admin pode editar e excluir
  const isAdmin = usuario.perfil === 'admin'

  // carrega as avaliações do paciente
  function loadScreenings() {
    listarTriagensDoPaciente(id).then(setScreenings)
  }

  // carrega o paciente do back
  useEffect(() => {
    buscarPaciente(id)
      .then((data) => {
        setPatient(data)
        loadScreenings()
      })
      .catch((err) => {
        // paciente inexistente ou sem acesso volta para a lista
        if (err.status === 403 || err.status === 404) navigate('/pacientes', { replace: true })
      })
  }, [id])

  // espera o paciente carregar
  if (!patient) return null

  // exclui o paciente e volta para a lista
  async function handleDeletePatient() {
    if (!window.confirm(`Excluir ${patient.nome} e todas as avaliações?`)) return
    try {
      await excluirPaciente(id)
      navigate('/pacientes')
    } catch (err) {
      window.alert(err.message)
    }
  }

  // exclui a avaliação e atualiza a tabela
  async function handleDeleteScreening(screeningId) {
    if (!window.confirm('Excluir esta avaliação?')) return
    try {
      await excluirTriagem(screeningId)
      loadScreenings()
    } catch (err) {
      window.alert(err.message)
    }
  }

  const subtitle = `${age(patient.data_nascimento)} anos · ${SEX_LABEL[patient.sexo_biologico]}`

  return (
    <>
      <PageHeader crumbs={['Pacientes', patient.nome]} title={patient.nome} subtitle={subtitle}>
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
              <dd>{displayValue(field, fieldValue(patient, field.name))}</dd>
            </div>
          ))}
        </dl>
      </section>

      <PatientNotes patient={patient} />

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
              <tr key={screening.id_triagem}>
                <td>{formatDate(screening.hora_triagem)}</td>
                <td>{screening.aplicada_por}</td>
                <td>{formatScore(screening.pontuacao)}</td>
                <td><StatusBadge status={screening.status} /></td>
                <td className="actions">
                  <Link to={`/triagens/${screening.id_triagem}`}>Ver</Link>
                  {isAdmin && <Link to={`/triagem?avaliacao=${screening.id_triagem}`}>Editar</Link>}
                  {isAdmin && <button className="link-btn link-danger" onClick={() => handleDeleteScreening(screening.id_triagem)}>Excluir</button>}
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
function PatientNotes({ patient }) {
  const patientId = patient.id_paciente
  const [observations, setObservations] = useState(patient.observacoes || '')
  const [documents, setDocuments] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // carrega os documentos do back
  function loadDocuments() {
    listarDocumentos(patientId).then(setDocuments)
  }

  useEffect(() => {
    loadDocuments()
  }, [patientId])

  // salva o texto das observações
  async function handleSaveObservations() {
    setMessage('')
    setError('')
    try {
      await salvarObservacoes(patientId, observations)
      setMessage('Observações salvas.')
    } catch (err) {
      setError(err.message)
    }
  }

  // valida e envia o arquivo escolhido
  async function handleFileChange(event) {
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

    try {
      await enviarDocumento(patientId, file)
      loadDocuments()
      setMessage('Documento anexado.')
    } catch (err) {
      setError(err.message)
    }
  }

  // remove o documento depois de confirmar
  async function handleRemoveDocument(doc) {
    if (!window.confirm(`Remover ${doc.nome_arquivo}?`)) return
    setMessage('')
    setError('')
    try {
      await excluirDocumento(doc.id_documento)
      loadDocuments()
      setMessage('Documento removido.')
    } catch (err) {
      setError(err.message)
    }
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
            <li key={doc.id_documento}>
              <div>
                <a href={linkDocumento(doc.id_documento)} download={doc.nome_arquivo}>{doc.nome_arquivo}</a>
                <p className="muted small">{formatSize(doc.tamanho_bytes)} · {formatDate(doc.enviado_em)} · {doc.enviado_por}</p>
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
