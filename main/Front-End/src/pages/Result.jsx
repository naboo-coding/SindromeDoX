// resultado da triagem
import { useEffect } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canSee, getScreening } from '../services/api'
import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { SEX_LABEL, age, formatDate, formatScore } from '../utils/format'
import { screeningStatus, symptomsFor } from '../utils/score'
import { UNSCORED_BEHAVIOR_SIGNS, UNSCORED_PHYSICAL_SIGNS } from '../data/questions'

// sinais registrados que não entram na pontuação
const UNSCORED_SIGNS = [...UNSCORED_PHYSICAL_SIGNS, ...UNSCORED_BEHAVIOR_SIGNS]

// orientação para cada resultado
const GUIDANCE = {
  met: {
    title: 'Indicada pesquisa por PCR para SXF',
    text: 'A pontuação atingiu o limite de referência. Recomenda-se encaminhar o paciente para o teste genético confirmatório.',
  },
  notMet: {
    title: 'Pesquisa PCR para SXF não indicada',
    text: 'A pontuação ficou abaixo do limite de referência. Isso não exclui a síndrome: se surgirem novos sinais ou houver histórico familiar, refaça a triagem ou procure um especialista.',
  },
  // pesos ainda não configurados
  pending: {
    title: 'Pontuação ainda não calculada',
    text: 'Os pesos do checklist ainda não foram configurados. As respostas foram salvas. Depois que os pesos forem definidos, um administrador pode editar a avaliação para gerar a pontuação.',
  },
}

export default function Result() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const screening = getScreening(id)
  // triagem existe e é de um paciente que o usuário pode ver
  const allowed = Boolean(screening) && canSee(user, screening.patient)

  // com ?imprimir na URL abre a impressão
  useEffect(() => {
    if (allowed && params.has('imprimir')) {
      window.print()
    }
  }, [allowed, params])

  // sem permissão volta para a lista
  if (!allowed) {
    return <Navigate to="/pacientes" replace />
  }

  const { patient, answers } = screening
  const status = screeningStatus(screening)
  const guidance = GUIDANCE[status]
  const hasOtherSigns = answers.signs.includes('other')

  // imprime ou salva em PDF pelo navegador
  function handlePrint() {
    window.print()
  }

  return (
    <>
      <PageHeader
        crumbs={['Pacientes', patient.name, 'Resultado']}
        title="Resultado da triagem"
        subtitle={`Paciente: ${patient.name} · ${age(patient.birthDate)} anos · ${SEX_LABEL[patient.sex]}`}
      />

      <section className={`card result-card result-${status}`}>
        <div className="score-box">
          <strong>{formatScore(screening.score)}</strong>
          <span>pontuação</span>
          <span className="score-threshold">Limite de referência: {formatScore(screening.threshold)}</span>
        </div>
        <div className="result-body">
          <StatusBadge screening={screening} />
          <h2 className="result-title">{guidance.title}</h2>
          <p>{guidance.text}</p>
          <p className="result-meta">
            Avaliação de {formatDate(screening.date)} · Profissional responsável: {screening.professional}
          </p>
        </div>
      </section>

      <section className="card section-gap">
        <h2 className="section-title">Sintomas registrados</h2>
        <ul className="symptom-list">
          {symptomsFor(patient.sex).map((symptom) => {
            const isPresent = answers.signs.includes(symptom.id)
            return (
              <li key={symptom.id} className={isPresent ? 'present' : undefined}>
                <span>{symptom.label}</span>
                <strong>{isPresent ? 'Presente' : 'Ausente'}</strong>
              </li>
            )
          })}
        </ul>

        <h3 className="section-subtitle">Outros sinais observados (sem pontuação)</h3>
        <ul className="symptom-list">
          {UNSCORED_SIGNS.map((sign) => {
            const isPresent = answers.signs.includes(sign.id)
            return (
              <li key={sign.id} className={isPresent ? 'present' : undefined}>
                <span>{sign.label}</span>
                <strong>{isPresent ? 'Presente' : 'Ausente'}</strong>
              </li>
            )
          })}
        </ul>
        {hasOtherSigns && <p className="result-meta">Outros sinais: {answers.otherText}</p>}
        {answers.observations && (
          <>
            <h3 className="section-subtitle">Observações clínicas</h3>
            <p>{answers.observations}</p>
          </>
        )}
      </section>

      <p className="hint">Esta é uma ferramenta de triagem e apoio ao encaminhamento. O resultado não confirma nem exclui a Síndrome do X Frágil.</p>

      <div className="result-actions no-print">
        <button className="btn btn-outline" onClick={handlePrint}>Imprimir</button>
        <button className="btn btn-outline" onClick={handlePrint}>Baixar PDF</button>
        <Link to={`/pacientes/${patient.id}`} className="btn">Ver paciente</Link>
      </div>
    </>
  )
}
