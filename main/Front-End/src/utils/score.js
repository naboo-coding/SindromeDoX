// cálculo da pontuação da triagem com base no checklist.json
// TODO: mover o cálculo da pontuação para o backend
import checklist from '../config/checklist.json'

// ponto de corte de cada sexo
export const THRESHOLDS = checklist.thresholds

// sintomas que valem para o sexo informado
export function symptomsFor(sex) {
  return checklist.symptoms.filter((s) => !s.sex || s.sex === sex)
}

// verifica se os pesos e o ponto de corte estão preenchidos
export function isCalculationReady(sex) {
  const threshold = THRESHOLDS[sex]
  if (threshold === null || threshold === undefined) {
    return false
  }
  for (const symptom of symptomsFor(sex)) {
    const weight = symptom.weights[sex]
    if (weight === null || weight === undefined) {
      return false
    }
  }
  return true
}

// soma os pesos dos sintomas marcados
export function calculateScore(signs, sex) {
  if (!isCalculationReady(sex)) {
    return null
  }

  let total = 0
  for (const symptom of symptomsFor(sex)) {
    if (signs.includes(symptom.id)) {
      total = total + symptom.weights[sex]
    }
  }

  // arredonda para 2 casas decimais
  return Math.round(total * 100) / 100
}

// compara a pontuação com o ponto de corte
export function screeningStatus({ score, threshold }) {
  if (score === null || score === undefined) {
    return 'pending'
  }
  if (score >= threshold) {
    return 'met'
  }
  return 'notMet'
}

// texto e cor de cada status
export const STATUS = {
  met: { label: 'Critério atingido', tone: 'success' },
  notMet: { label: 'Critério não atingido', tone: 'neutral' },
  pending: { label: 'Cálculo pendente', tone: 'warning' },
}
