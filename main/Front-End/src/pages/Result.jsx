// resultado da triagem
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { buscarChecklist, buscarTriagem } from '../services/api'
import { PageHeader, StatusBadge } from '../components'
import { SEX_LABEL, age, formatDate, formatScore } from '../utils'
import { UNSCORED_BEHAVIOR_SIGNS, UNSCORED_PHYSICAL_SIGNS } from '../data'

// sinais registrados que não entram na pontuação
const UNSCORED_SIGNS = [...UNSCORED_PHYSICAL_SIGNS, ...UNSCORED_BEHAVIOR_SIGNS]

// orientação e classe do card para cada status do back
const GUIDANCE = {
  atingido: {
    className: 'result-met',
    title: 'Indicada pesquisa por PCR para SXF',
    text: 'A pontuação atingiu o limite de referência. Recomenda-se encaminhar o paciente para o teste genético confirmatório.',
  },
  nao_atingido: {
    className: 'result-notMet',
    title: 'Pesquisa PCR para SXF não indicada',
    text: 'A pontuação ficou abaixo do limite de referência. Isso não exclui a síndrome: se surgirem novos sinais ou houver histórico familiar, refaça a triagem ou procure um especialista.',
  },
  // pesos ainda não configurados
  pendente: {
    className: 'result-pending',
    title: 'Pontuação ainda não calculada',
    text: 'Os pesos do checklist ainda não foram configurados. As respostas foram salvas. Depois que os pesos forem definidos, um administrador pode editar a avaliação para gerar a pontuação.',
  },
}

export default function Result() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [screening, setScreening] = useState(null)
  const [checklist, setChecklist] = useState(null)

  // carrega a triagem e o checklist do back
  useEffect(() => {
    async function load() {
      try {
        setScreening(await buscarTriagem(id))
        setChecklist(await buscarChecklist())
      } catch (err) {
        // sem acesso ou não encontrada volta para a lista
        if (err.status === 403 || err.status === 404) {
          navigate('/pacientes', { replace: true })
        }
      }
    }
    load()
  }, [id, navigate])

  // com ?imprimir na URL abre a impressão depois de carregar
  const loaded = Boolean(screening && checklist)
  useEffect(() => {
    if (loaded && params.has('imprimir')) {
      window.print()
    }
  }, [loaded, params])

  // espera os dados chegarem
  if (!loaded) {
    return null
  }

  const patient = screening.paciente
  const answers = screening.respostas
  const guidance = GUIDANCE[screening.status]
  const hasOtherSigns = answers.signs.includes('other')

  // sintomas do checklist que valem para o sexo do paciente
  const symptoms = checklist.sintomas.filter(
    (symptom) => symptom.sexo_restrito === null || symptom.sexo_restrito === patient.sexo_biologico
  )

  // imprime ou salva em PDF pelo navegador
  function handlePrint() {
    window.print()
  }

  return (
    <>
      <PageHeader
        crumbs={['Pacientes', patient.nome, 'Resultado']}
        title="Resultado da triagem"
        subtitle={`Paciente: ${patient.nome} · ${age(patient.data_nascimento)} anos · ${SEX_LABEL[patient.sexo_biologico]}`}
      />

      <section className={`card result-card ${guidance.className}`}>
        <div className="score-box">
          <strong>{formatScore(screening.pontuacao)}</strong>
          <span>pontuação</span>
          <span className="score-threshold">Limite de referência: {formatScore(screening.limiar)}</span>
        </div>
        <div className="result-body">
          <StatusBadge status={screening.status} />
          <h2 className="result-title">{guidance.title}</h2>
          <p>{guidance.text}</p>
          <p className="result-meta">
            Avaliação de {formatDate(screening.hora_triagem)} · Profissional responsável: {screening.aplicada_por}
          </p>
        </div>
      </section>

      <section className="card section-gap">
        <h2 className="section-title">Sintomas registrados</h2>
        <ul className="symptom-list">
          {symptoms.map((symptom) => {
            const isPresent = answers.signs.includes(symptom.codigo)
            return (
              <li key={symptom.codigo} className={isPresent ? 'present' : undefined}>
                <span>{symptom.rotulo}</span>
                <strong>{isPresent ? 'Presente' : 'Ausente'}</strong>
              </li>
            )
          })}
        </ul>

        <h3 className="section-subtitle">Outros sinais observados (sem pontuação)</h3>
        <ul className="symptom-list">
          {UNSCORED_SIGNS.map((sign) => {
            const isPresent = answers.signs.includes(sign.codigo)
            return (
              <li key={sign.codigo} className={isPresent ? 'present' : undefined}>
                <span>{sign.rotulo}</span>
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
        <Link to={`/pacientes/${screening.id_paciente}`} className="btn">Ver paciente</Link>
      </div>
    </>
  )
}
