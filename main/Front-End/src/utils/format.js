// funções de formatação e textos das telas

// converte a data para o formato brasileiro
export function formatDate(iso) {
  const parts = iso.split('-')
  parts.reverse()
  return parts.join('/')
}

// data de hoje no formato AAAA-MM-DD
export function today() {
  return new Date().toLocaleDateString('sv')
}

// calcula a idade a partir da data de nascimento
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

export const ROLE_LABEL = { admin: 'Administrador', professional: 'Profissional' }

// busca texto sem diferenciar maiúsculas e minúsculas
export function includesText(text, search) {
  const normalizedText = text.toLowerCase()
  const normalizedSearch = search.trim().toLowerCase()
  return normalizedText.includes(normalizedSearch)
}

export const SEX_LABEL = { M: 'Masculino', F: 'Feminino' }

// mostra a pontuação com vírgula decimal
export function formatScore(score) {
  if (score === null || score === undefined) {
    return '—'
  }
  return score.toFixed(2).replace('.', ',')
}
