// formulário de cadastro e edição de paciente
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { buscarPaciente, criarPaciente, editarPaciente } from '../services/api'
import { CONTACT_FIELDS, PERSONAL_FIELDS, RESPONSAVEL_FIELDS } from '../data'
import { PageHeader } from '../components'
import { formatContact, maskCpf, maskPhone, onlyDigits } from '../utils'

// campo do formulário, select ou input
function Field({ name, label, required, options, defaultValue, mask, ...props }) {
  // aplica a máscara de cpf ou telefone enquanto digita
  function handleInput(event) {
    if (mask === 'cpf') event.target.value = maskCpf(event.target.value)
    if (mask === 'telefone') event.target.value = maskPhone(event.target.value)
  }

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
    control = <input id={name} name={name} className="input" required={required} defaultValue={defaultValue} onInput={mask ? handleInput : undefined} {...props} />
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
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [error, setError] = useState('')
  // com id na URL é edição
  const isEditing = Boolean(id)
  // responsável cadastrando: os dados de contato são os dele
  const isResponsavel = !isEditing && usuario.perfil === 'responsavel'

  // na edição, carrega o paciente do back
  useEffect(() => {
    if (!id) return
    buscarPaciente(id)
      .then(setPatient)
      .catch((err) => {
        // paciente inexistente ou sem acesso volta para a lista
        if (err.status === 403 || err.status === 404) navigate('/pacientes')
      })
  }, [id])

  // espera o paciente carregar para preencher os campos
  if (isEditing && !patient) return null

  async function handleSubmit(event) {
    event.preventDefault()
    // lê os campos do formulário
    const data = Object.fromEntries(new FormData(event.currentTarget))

    // monta o corpo no formato do back
    const body = {
      nome: data.nome,
      sexo_biologico: data.sexo_biologico,
      data_nascimento: data.data_nascimento,
      nome_mae: data.nome_mae,
      nome_pai: data.nome_pai,
      cidade: data.cidade,
      estado: data.estado,
      pais: data.pais,
      responsavel: {
        nome: data.responsavel_nome,
        cpf: onlyDigits(data.cpf),
        email: data.email,
        telefone: onlyDigits(data.telefone),
        whatsapp: onlyDigits(data.whatsapp),
        telefone2: onlyDigits(data.telefone2),
        parentesco: data.parentesco,
      },
    }

    setError('')
    try {
      if (isEditing) {
        await editarPaciente(id, body)
        navigate(`/pacientes/${id}`)
        return
      }

      // cadastra e abre a triagem
      body.consentimento = true
      const result = await criarPaciente(body)
      navigate(`/triagem?paciente=${result.id_paciente}`)
    } catch (err) {
      setError(err.message)
    }
  }

  function renderField(field) {
    const responsavelKey = RESPONSAVEL_FIELDS[field.name]
    let initialValue = field.defaultValue
    let readOnly = false

    if (isEditing) {
      // valor salvo no paciente ou no responsável
      initialValue = responsavelKey ? patient.responsavel?.[responsavelKey] : patient[field.name]
    } else if (isResponsavel && responsavelKey && field.name !== 'parentesco') {
      // dados do usuário logado, sem edição
      initialValue = usuario[responsavelKey]
      readOnly = true
    }

    return <Field key={field.name} {...field} defaultValue={formatContact(field.name, initialValue)} readOnly={readOnly} />
  }

  let crumbs
  let title
  let cancelPath
  let submitText
  if (isEditing) {
    crumbs = ['Pacientes', patient.nome, 'Editar']
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
        {/* aceite da LGPD, só no cadastro */}
        {!isEditing && (
          <label className="checkbox-line">
            <input type="checkbox" required />
            Li e aceito o termo de consentimento (LGPD) para o tratamento dos dados deste paciente.
          </label>
        )}
        {error && <p className="alert alert-error">{error}</p>}
        <div className="form-actions">
          <Link to={cancelPath} className="btn btn-outline">Cancelar</Link>
          <button className="btn">{submitText}</button>
        </div>
      </form>
    </>
  )
}
