// funções de formatação, textos fixos e mensagens de validação em português

// converte AAAA-MM-DD (ou AAAA-MM-DD HH:MM:SS) para DD/MM/AAAA
export function formatDate(texto) {
  const parts = texto.slice(0, 10).split('-')
  parts.reverse()
  return parts.join('/')
}

// idade em anos completos a partir da data de nascimento AAAA-MM-DD
export function age(birthDate) {
  const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentDay = now.getDate()

  const hadBirthdayThisYear =
    currentMonth > birthMonth || (currentMonth === birthMonth && currentDay >= birthDay)

  let years = now.getFullYear() - birthYear
  // ainda não fez aniversário este ano
  if (!hadBirthdayThisYear) {
    years = years - 1
  }
  return years
}

// deixa só os números (tira pontos, traços e parênteses de CPF e telefone)
export function onlyDigits(texto) {
  return (texto || '').replace(/\D/g, '')
}

// formato que o campo precisa ter para ser aceito
export const CPF_PATTERN = '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}'
export const PHONE_PATTERN = '\\(\\d{2}\\) \\d{4,5}-\\d{4}'

// máscara do cpf enquanto digita: no máximo 11 números, 000.000.000-00
export function maskCpf(texto) {
  const d = onlyDigits(texto).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

// máscara do telefone enquanto digita: DDD e no máximo 9 números, (41) 99999-9999
export function maskPhone(texto) {
  const d = onlyDigits(texto).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// coloca a máscara no cpf e nos telefones que vêm do back só com números
export function formatContact(name, value) {
  if (!value) return value
  if (name === 'cpf') return maskCpf(value)
  if (['whatsapp', 'telefone', 'telefone2'].includes(name)) return maskPhone(value)
  return value
}

// busca sem diferenciar maiúsculas e minúsculas
export function includesText(text, search) {
  return text.toLowerCase().includes(search.trim().toLowerCase())
}

// pontuação com 2 casas e vírgula; sem pontuação mostra um travessão
export function formatScore(score) {
  if (score === null || score === undefined) {
    return '—'
  }
  return score.toFixed(2).replace('.', ',')
}

export const ROLE_LABEL = { responsavel: 'Responsável', profissional: 'Profissional', admin: 'Administrador' }

export const SEX_LABEL = { M: 'Masculino', F: 'Feminino' }

// texto e cor de cada status que o back devolve
export const STATUS = {
  atingido: { label: 'Critério atingido', tone: 'success' },
  nao_atingido: { label: 'Critério não atingido', tone: 'neutral' },
  pendente: { label: 'Cálculo pendente', tone: 'warning' },
}

// escolhe a mensagem de validação pelo tipo de erro do campo
function getMessage(field) {
  const validity = field.validity

  if (validity.valueMissing) {
    if (field.type === 'checkbox') {
      return 'Marque esta caixa para continuar.'
    }
    if (field.tagName === 'SELECT' || field.type === 'radio') {
      return 'Selecione uma opção.'
    }
    return 'Preencha este campo.'
  }

  if (validity.typeMismatch && field.type === 'email') {
    return 'Digite um e-mail válido, por exemplo: nome@exemplo.com'
  }

  if (validity.patternMismatch && field.name === 'cpf') {
    return 'O CPF precisa ter 11 números.'
  }

  if (validity.patternMismatch && field.type === 'tel') {
    return 'Digite o telefone com DDD, por exemplo: (41) 99999-9999'
  }

  if (validity.tooShort) {
    return `Use pelo menos ${field.minLength} caracteres (você digitou ${field.value.length}).`
  }

  if (validity.badInput && field.type === 'date') {
    return 'Digite uma data válida.'
  }

  if (validity.rangeUnderflow && field.type === 'date') {
    return 'A data deve ser a partir de 01/01/1900.'
  }

  if (validity.rangeOverflow && field.type === 'date') {
    return 'A data não pode ser no futuro.'
  }

  return 'Valor inválido.'
}

// coloca a mensagem em português no campo inválido
function handleInvalid(event) {
  const field = event.target
  // limpa a mensagem anterior
  field.setCustomValidity('')
  if (!field.validity.valid) {
    field.setCustomValidity(getMessage(field))
  }
}

// apaga a mensagem quando o usuário altera o campo
function handleChange(event) {
  const field = event.target
  if (field.setCustomValidity) {
    field.setCustomValidity('')
  }
}

// ativa as mensagens em português em todos os formulários
export function enablePortugueseValidationMessages() {
  document.addEventListener('invalid', handleInvalid, true)
  document.addEventListener('input', handleChange, true)
  document.addEventListener('change', handleChange, true)
}
