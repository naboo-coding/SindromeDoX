// dados fixos das telas: perguntas da triagem, sinais extras e campos do cadastro de paciente
import { CPF_PATTERN, PHONE_PATTERN } from './utils'

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

// perguntas da triagem sobre família e exame de DNA
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

// filtra as perguntas que devem aparecer
export function visibleQuestions(answers) {
  return FAMILY_QUESTIONS.filter((question) => !question.showIf || question.showIf(answers))
}

// sinais físicos registrados sem peso (não entram na pontuação)
export const UNSCORED_PHYSICAL_SIGNS = [
  { codigo: 'flatFeet', rotulo: 'Pés planos (pé chato)' },
  { codigo: 'lowMuscleTone', rotulo: 'Tônus muscular baixo (hipotonia)' },
  { codigo: 'seizures', rotulo: 'Convulsões' },
]

// sinais de comportamento registrados sem peso (não entram na pontuação)
export const UNSCORED_BEHAVIOR_SIGNS = [
  { codigo: 'handBiting', rotulo: 'Morde as mãos ou os dedos' },
  { codigo: 'repetitiveSpeech', rotulo: 'Fala repetitiva (repete palavras ou frases)' },
  { codigo: 'anxiety', rotulo: 'Ansiedade ou timidez excessiva' },
  { codigo: 'sensorySensitivity', rotulo: 'Hipersensibilidade a sons, texturas ou toque' },
]

// opções extras que não entram na pontuação
export const EXTRA_SIGNS = [
  { codigo: 'none', rotulo: 'Não apresenta nenhum dos sintomas' },
  { codigo: 'other', rotulo: 'Outro(s)' },
]

// campos do cadastro de paciente; os nomes são os mesmos do back
export const PERSONAL_FIELDS = [
  { name: 'nome', label: 'Nome do paciente', required: true },
  // data entre 1900 e hoje
  { name: 'data_nascimento', label: 'Data de nascimento', type: 'date', required: true, min: '1900-01-01', max: new Date().toLocaleDateString('sv') },
  { name: 'sexo_biologico', label: 'Sexo biológico', required: true, options: [['M', 'Masculino'], ['F', 'Feminino']] },
  { name: 'nome_mae', label: 'Nome da mãe', required: true },
  { name: 'nome_pai', label: 'Nome do pai' },
  { name: 'responsavel_nome', label: 'Responsável pelo paciente', required: true },
  { name: 'parentesco', label: 'Grau de parentesco com o paciente', required: true },
  { name: 'cpf', label: 'CPF do responsável', required: true, placeholder: '000.000.000-00', mask: 'cpf', pattern: CPF_PATTERN, inputMode: 'numeric' },
  { name: 'cidade', label: 'Cidade', required: true },
  { name: 'estado', label: 'Estado', required: true },
  { name: 'pais', label: 'País', required: true, defaultValue: 'Brasil' },
]

// campos do formulário que ficam no bloco responsavel do back (campo do form: campo do back)
export const RESPONSAVEL_FIELDS = {
  responsavel_nome: 'nome',
  parentesco: 'parentesco',
  cpf: 'cpf',
  whatsapp: 'whatsapp',
  telefone: 'telefone',
  telefone2: 'telefone2',
  email: 'email',
}

// contatos do responsável
export const CONTACT_FIELDS = [
  { name: 'whatsapp', label: 'WhatsApp', type: 'tel', mask: 'telefone', pattern: PHONE_PATTERN },
  { name: 'telefone', label: 'Telefone para ligações', type: 'tel', required: true, mask: 'telefone', pattern: PHONE_PATTERN },
  { name: 'telefone2', label: 'Telefone 2', type: 'tel', mask: 'telefone', pattern: PHONE_PATTERN },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
]
