// tela de triagem em 4 etapas
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createScreening, getPatient, getScreening, listPatients, updateScreening } from '../services/api'
import { EXTRA_SIGNS, visibleQuestions } from '../data/questions'
import PageHeader from '../components/PageHeader'
import { age } from '../utils/format'
import { isCalculationReady, symptomsFor } from '../utils/score'

const STEPS = ['Histórico familiar', 'Sinais físicos', 'Comportamento e desenvolvimento', 'Revisão']

export default function Screening() {
  const [params, setParams] = useSearchParams()
  const patientId = params.get('paciente')
  const screeningId = params.get('avaliacao')

  function handlePickPatient(id) {
    setParams({ paciente: id })
  }

  // edita, cria nova ou escolhe o paciente
  if (screeningId) {
    const screening = getScreening(screeningId)
    return <ScreeningForm key={screeningId} patient={screening.patient} screening={screening} />
  }
  if (patientId) {
    return <ScreeningForm key={patientId} patient={getPatient(patientId)} />
  }
  return <PatientPicker onPick={handlePickPatient} />
}

// escolha do paciente
function PatientPicker({ onPick }) {
  const { user } = useAuth()

  function handleSubmit(e) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onPick(formData.get('patient'))
  }

  return (
    <>
      <PageHeader crumbs={['Nova triagem']} title="Nova triagem" subtitle="Escolha o paciente que fará a triagem." />
      <form className="card picker" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="patient">Paciente</label>
          <select id="patient" name="patient" className="input" required defaultValue="">
            <option value="" disabled>Selecione</option>
            {listPatients(user).map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
          </select>
        </div>
        <button className="btn">Iniciar triagem</button>
        <p className="muted small">Paciente ainda não cadastrado? <Link to="/pacientes/novo">Cadastrar paciente</Link></p>
      </form>
    </>
  )
}

// questionário da triagem, screening só vem na edição
function ScreeningForm({ patient, screening }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  let initialAnswers = { signs: [], otherText: '', observations: '' }
  if (screening && screening.answers) {
    initialAnswers = screening.answers
  }

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(initialAnswers)
  const [error, setError] = useState('')

  // perguntas visíveis conforme as respostas
  const questions = visibleQuestions(answers)

  // sintomas conforme o sexo do paciente
  const symptoms = symptomsFor(patient.sex)
  const physicalSigns = symptoms.filter((symptom) => symptom.group === 'physical')
  const behaviorOnlySigns = symptoms.filter((symptom) => symptom.group === 'behavior')
  const behaviorSigns = [...behaviorOnlySigns, ...EXTRA_SIGNS]

  // sem pesos configurados salva sem pontuação
  const ready = isCalculationReady(patient.sex)

  const isFamilyStep = step === 0
  const isSignsStep = step === 1 || step === 2
  const isReviewStep = step === 3

  let signsToShow = behaviorSigns
  if (step === 1) {
    signsToShow = physicalSigns
  }

  const showOtherInput = step === 2 && answers.signs.includes('other')
  const answeredCount = questions.filter((question) => answers[question.id]).length
  const progressPercent = ((step + 1) / STEPS.length) * 100

  let finishLabel = 'Salvar avaliação'
  if (screening) {
    finishLabel = 'Salvar alterações'
  } else if (ready) {
    finishLabel = 'Calcular resultado'
  }

  // conta os sinais marcados para a revisão
  function describeCheckedSigns(signList) {
    let count = 0
    for (const id of answers.signs) {
      const isInList = signList.some((sign) => sign.id === id)
      if (id !== 'none' && isInList) {
        count++
      }
    }
    if (count === 1) {
      return '1 sinal assinalado'
    }
    return `${count} sinais assinalados`
  }

  function setAnswer(id, value) {
    setAnswers((current) => ({ ...current, [id]: value }))
  }

  // marca ou desmarca um sintoma
  function toggleSign(id) {
    setAnswers((current) => {
      let signs
      if (current.signs.includes(id)) {
        signs = current.signs.filter((sign) => sign !== id)
      } else if (id === 'none') {
        // "nenhum" desmarca os outros sintomas
        signs = ['none']
      } else {
        // outro sintoma desmarca o "nenhum"
        const signsWithoutNone = current.signs.filter((sign) => sign !== 'none')
        signs = [...signsWithoutNone, id]
      }
      return { ...current, signs }
    })
  }

  // valida a etapa atual
  function validate() {
    if (step === 0) {
      const hasUnansweredRequired = questions.some((question) => question.required && !answers[question.id])
      if (hasUnansweredRequired) {
        return 'Responda todas as perguntas obrigatórias.'
      }
    }
    if (step === 2) {
      if (answers.signs.length === 0) {
        return 'Assinale ao menos um sinal ou "Não apresenta nenhum dos sintomas".'
      }
      if (answers.signs.includes('other') && !answers.otherText.trim()) {
        return 'Descreva os outros sinais observados.'
      }
    }
    return ''
  }

  function goTo(target) {
    setError('')
    setStep(target)
  }

  function next() {
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    goTo(step + 1)
  }

  function handleBack() {
    if (step === 0) {
      navigate(-1)
    } else {
      goTo(step - 1)
    }
  }

  // salva a triagem e abre o resultado
  function finish() {
    if (screening) {
      updateScreening(screening.id, answers, user)
      navigate(`/triagens/${screening.id}`)
      return
    }
    const newScreening = createScreening(patient.id, answers, user)
    navigate(`/triagens/${newScreening.id}`)
  }

  return (
    <>
      <PageHeader
        crumbs={['Pacientes', patient.name, 'Triagem']}
        title={screening ? 'Editar avaliação' : 'Questionário de triagem'}
        subtitle={`Paciente: ${patient.name} · ${age(patient.birthDate)} anos`}
      />
      <div className="card">
        <ol className="steps">
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? 'current' : undefined}>{i + 1} {label}</li>
          ))}
        </ol>
        <div className="progress"><div style={{ width: `${progressPercent}%` }} /></div>

        <h2 className="step-title">Etapa {step + 1} de {STEPS.length} — {STEPS[step]}</h2>

        {isFamilyStep &&
          questions.map((question) => (
            <fieldset key={question.id} className="question">
              <legend>{question.label}{question.required && <span className="required"> *</span>}</legend>
              <div className="choices">
                {question.options.map((option) => (
                  <label key={option.value} className="choice">
                    <input
                      type="radio"
                      name={question.id}
                      checked={answers[question.id] === option.value}
                      onChange={() => setAnswer(question.id, option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

        {isSignsStep && (
          <fieldset className="question">
            <legend>Assinale os sinais observados</legend>
            <div className="checks">
              {signsToShow.map((sign) => (
                <label key={sign.id} className="choice">
                  <input type="checkbox" checked={answers.signs.includes(sign.id)} onChange={() => toggleSign(sign.id)} />
                  {sign.label}
                </label>
              ))}
            </div>
            {showOtherInput && (
              <input
                className="input other-input"
                placeholder="Descreva os outros sinais"
                value={answers.otherText}
                onChange={(e) => setAnswer('otherText', e.target.value)}
              />
            )}
            <p className="hint">Responda com base no que você observa no dia a dia.</p>
          </fieldset>
        )}

        {isReviewStep && (
          <>
            <ReviewItem title={STEPS[0]} detail={`${answeredCount} de ${questions.length} perguntas respondidas`} onEdit={() => goTo(0)} />
            <ReviewItem title={STEPS[1]} detail={describeCheckedSigns(physicalSigns)} onEdit={() => goTo(1)} />
            <ReviewItem title={STEPS[2]} detail={describeCheckedSigns(behaviorSigns)} onEdit={() => goTo(2)} />
            <div className="field observations">
              <label htmlFor="observations">Observações clínicas</label>
              <textarea
                id="observations"
                className="input"
                rows={3}
                value={answers.observations}
                onChange={(e) => setAnswer('observations', e.target.value)}
              />
            </div>
            {ready ? (
              <p className="hint">Ao calcular, a pontuação será gerada automaticamente e salva no histórico do paciente.</p>
            ) : (
              <p className="alert alert-warning">Os pesos do checklist ainda não foram configurados. A avaliação será salva sem pontuação.</p>
            )}
          </>
        )}

        {error && <p className="alert alert-error">{error}</p>}

        <div className="form-actions">
          <button className="btn btn-outline" onClick={handleBack}>Voltar</button>
          {isReviewStep ? (
            <button className="btn" onClick={finish}>{finishLabel}</button>
          ) : (
            <button className="btn" onClick={next}>Próximo</button>
          )}
        </div>
      </div>
    </>
  )
}

// item do resumo da revisão
function ReviewItem({ title, detail, onEdit }) {
  return (
    <div className="review-item">
      <div>
        <strong>{title}</strong>
        <p className="muted small">{detail}</p>
      </div>
      <button className="link-btn" onClick={onEdit}>Editar</button>
    </div>
  )
}
