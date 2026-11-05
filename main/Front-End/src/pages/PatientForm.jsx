// formulário de cadastro e edição de paciente
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createPatient, getPatient, updatePatient } from '../services/api'
import { CONTACT_FIELDS, PERSONAL_FIELDS } from '../data/patientFields'
import PageHeader from '../components/PageHeader'

// campo do formulário, select ou input
function Field({ name, label, required, options, defaultValue, ...props }) {
  let control
  if (options) {
    // opções no formato [valor, texto]
    control = (
      <select id={name} name={name} className="input" required={required} defaultValue={defaultValue ?? ''}>
        <option value="" disabled>Selecione</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    )
  } else {
    control = <input id={name} name={name} className="input" required={required} defaultValue={defaultValue} {...props} />
  }

  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required && <span className="required"> *</span>}
      </label>
      {control}
    </div>
  )
}

export default function PatientForm() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  // com id na URL é edição
  const patient = id && getPatient(id)
  const isEditing = Boolean(patient)

  function handleSubmit(event) {
    event.preventDefault()
    // lê os campos do formulário
    const data = Object.fromEntries(new FormData(event.currentTarget))

    if (isEditing) {
      updatePatient(id, data, user)
      navigate(`/pacientes/${id}`)
      return
    }

    // cadastra e abre a triagem
    const newPatient = createPatient(data, user)
    navigate(`/triagem?paciente=${newPatient.id}`)
  }

  function renderField(field) {
    // valor salvo na edição, padrão no cadastro
    const initialValue = isEditing ? patient[field.name] : field.defaultValue
    return <Field key={field.name} {...field} defaultValue={initialValue} />
  }

  let crumbs
  let title
  let cancelPath
  let submitText
  if (isEditing) {
    crumbs = ['Pacientes', patient.name, 'Editar']
    title = 'Editar cadastro'
    cancelPath = `/pacientes/${id}`
    submitText = 'Salvar alterações'
  } else {
    crumbs = ['Pacientes', 'Novo paciente']
    title = 'Novo paciente'
    cancelPath = '/pacientes'
    submitText = 'Salvar e iniciar triagem'
  }

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={title}
        subtitle="Campos com * são obrigatórios."
      />
      <form className="card" onSubmit={handleSubmit}>
        <section className="form-section">
          <h2>Dados pessoais</h2>
          <div className="form-grid">{PERSONAL_FIELDS.map(renderField)}</div>
        </section>
        <section className="form-section">
          <h2>Formas de contato</h2>
          <div className="form-grid">{CONTACT_FIELDS.map(renderField)}</div>
        </section>
        <div className="form-actions">
          <Link to={cancelPath} className="btn btn-outline">Cancelar</Link>
          <button className="btn">{submitText}</button>
        </div>
      </form>
    </>
  )
}
