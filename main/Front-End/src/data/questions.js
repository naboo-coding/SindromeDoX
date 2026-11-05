// perguntas da triagem sobre família e exame de DNA

const YES_NO = [
  { value: 'no', label: 'Não' },
  { value: 'yes', label: 'Sim' },
]

// sim, não e não sei
const YES_NO_UNKNOWN = [...YES_NO, { value: 'unknown', label: 'Não sei' }]

// resultados possíveis do exame de DNA
const DNA_RESULTS = [
  { value: 'full', label: 'Mutação completa (+200 repetições)' },
  { value: 'pre', label: 'Pré-mutação (55 a 199 repetições)' },
  { value: 'gray', label: 'Zona gray/intermediária (40 a 54 repetições)' },
  { value: 'mosaic', label: 'Mosaicismo' },
  { value: 'negative', label: 'Negativo para XF (até 39 repetições)' },
  { value: 'unknown', label: 'Não sei' },
]

export const FAMILY_QUESTIONS = [
  {
    id: 'dnaTest',
    label: 'Já fez exame de DNA (sangue, saliva, etc.) para detectar a Síndrome do X Frágil (SXF)?',
    options: YES_NO,
    required: true,
  },
  {
    // só aparece para quem não fez o exame
    id: 'dnaInterest',
    label: 'Tem interesse em fazer o exame de DNA para X Frágil (PCR)?',
    options: YES_NO,
    showIf: (answers) => answers.dnaTest === 'no',
  },
  {
    // só aparece para quem já fez o exame
    id: 'dnaResult',
    label: 'Qual o resultado confirmado por laboratório (conforme número de repetições CGG)?',
    options: DNA_RESULTS,
    required: true,
    showIf: (answers) => answers.dnaTest === 'yes',
  },
  {
    id: 'autism',
    label: 'Possui diagnóstico de autismo?',
    options: YES_NO,
    required: true,
  },
  {
    id: 'siblings',
    label: 'Tem irmãos?',
    options: YES_NO,
    required: true,
  },
  {
    id: 'familyDisability',
    label: 'Há alguém na família com deficiência intelectual, atraso de desenvolvimento, dificuldades de aprendizagem ou autismo?',
    options: YES_NO_UNKNOWN,
    required: true,
  },
  {
    id: 'familyMenopause',
    label: 'Há antecedentes na família com diagnóstico de menopausa precoce?',
    options: YES_NO_UNKNOWN,
    required: true,
  },
  {
    id: 'familyAtaxia',
    label: 'Há antecedentes na família com ataxia (descoordenação motora) e tremores?',
    options: YES_NO_UNKNOWN,
    required: true,
  },
]

// opções extras que não entram na pontuação
export const EXTRA_SIGNS = [
  { id: 'none', label: 'Não apresenta nenhum dos sintomas' },
  { id: 'other', label: 'Outro(s)' },
]

// filtra as perguntas que devem aparecer
export function visibleQuestions(answers) {
  return FAMILY_QUESTIONS.filter((question) => !question.showIf || question.showIf(answers))
}
