// API simulada com localStorage, temporária até o backend em Flask ficar pronto
import seed from '../data/seed'
import { THRESHOLDS, calculateScore } from '../utils/score'
import { today } from '../utils/format'

// chaves usadas no localStorage
const DB_KEY = 'xfragil-db-v2'
const SESSION_KEY = 'xfragil-session'

// carrega o banco salvo ou uma cópia do seed
function loadDatabase() {
  const savedDatabase = JSON.parse(localStorage.getItem(DB_KEY))
  if (savedDatabase !== null) {
    return savedDatabase
  }
  return JSON.parse(JSON.stringify(seed))
}

const db = loadDatabase()

// salva o banco no localStorage
function save() {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

// remove a senha do usuário
function publicUser(user) {
  const userWithoutPassword = { ...user }
  delete userWithoutPassword.password
  return userWithoutPassword
}

// ordena da data mais recente para a mais antiga
function byDateDesc(a, b) {
  return b.date.localeCompare(a.date)
}

// admin vê todos, profissional só os que cadastrou
export function canSee(user, patient) {
  return user.role === 'admin' || patient.ownerId === user.id
}

// só admin pode editar ou excluir
function assertAdmin(user) {
  if (user.role !== 'admin') {
    throw new Error('Apenas administradores podem editar ou excluir.')
  }
}

// busca o usuário logado
export function getSessionUser() {
  const loggedUserId = localStorage.getItem(SESSION_KEY)
  const user = db.users.find((u) => u.id === loggedUserId)
  if (user) {
    return publicUser(user)
  }
  return null
}

// faz o login e salva a sessão
export function login(email, password) {
  const user = db.users.find((u) => u.email === email && u.password === password)
  if (!user) {
    throw new Error('E-mail ou senha incorretos.')
  }
  if (!user.active) {
    throw new Error('Usuário desativado. Fale com um administrador.')
  }
  localStorage.setItem(SESSION_KEY, user.id)
  return publicUser(user)
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

// cadastro público, sempre como profissional
export function register({ name, email, password }) {
  saveUser({ name, email, password, role: 'professional' })
  return login(email, password)
}

export function listUsers() {
  return db.users.map(publicUser)
}

// cria ou edita um usuário
export function saveUser(data) {
  const emailAlreadyUsed = db.users.some((u) => u.email === data.email && u.id !== data.id)
  if (emailAlreadyUsed) {
    throw new Error('E-mail já cadastrado.')
  }

  if (data.id) {
    const user = db.users.find((u) => u.id === data.id)
    // senha vazia mantém a atual
    const password = data.password || user.password
    Object.assign(user, data, { password: password })
  } else {
    // usuário novo começa ativo
    db.users.push({ ...data, id: crypto.randomUUID(), active: true })
  }
  save()
}

// ativa ou desativa um usuário
export function toggleUser(id) {
  const user = db.users.find((u) => u.id === id)
  user.active = !user.active
  save()
}

// triagem mais recente do paciente
function lastScreeningOf(patientId) {
  const patientScreenings = db.screenings.filter((s) => s.patientId === patientId)
  patientScreenings.sort(byDateDesc)
  return patientScreenings[0]
}

// lista os pacientes visíveis com a última triagem
export function listPatients(user) {
  const visiblePatients = db.patients.filter((p) => canSee(user, p))
  const patientsWithLastScreening = visiblePatients.map((p) => {
    return { ...p, lastScreening: lastScreeningOf(p.id) }
  })
  return patientsWithLastScreening
}

export function getPatient(id) {
  return db.patients.find((p) => p.id === id)
}

// cadastra um paciente com o usuário como dono
export function createPatient(data, user) {
  const patient = { ...data, id: crypto.randomUUID(), ownerId: user.id }
  db.patients.push(patient)
  save()
  return patient
}

export function updatePatient(id, data, user) {
  assertAdmin(user)
  const patient = getPatient(id)
  Object.assign(patient, data)
  save()
}

// exclui o paciente e as triagens dele
export function deletePatient(id, user) {
  assertAdmin(user)
  db.patients = db.patients.filter((p) => p.id !== id)
  db.screenings = db.screenings.filter((s) => s.patientId !== id)
  save()
}

function userName(id) {
  const user = db.users.find((u) => u.id === id)
  return user.name
}

// junta o paciente e o nome do profissional na triagem
function withRefs(screening) {
  return {
    ...screening,
    patient: getPatient(screening.patientId),
    professional: userName(screening.professionalId),
  }
}

// lista as triagens visíveis para o usuário
export function listScreenings(user) {
  const screeningsWithRefs = db.screenings.map(withRefs)
  const visibleScreenings = screeningsWithRefs.filter((s) => canSee(user, s.patient))
  visibleScreenings.sort(byDateDesc)
  return visibleScreenings
}

// lista as triagens de um paciente
export function listPatientScreenings(patientId) {
  const patientScreenings = db.screenings.filter((s) => s.patientId === patientId)
  const screeningsWithRefs = patientScreenings.map(withRefs)
  screeningsWithRefs.sort(byDateDesc)
  return screeningsWithRefs
}

export function getScreening(id) {
  const screening = db.screenings.find((s) => s.id === id)
  // triagem não encontrada
  if (!screening) {
    return undefined
  }
  return withRefs(screening)
}

// calcula a pontuação conforme o sexo do paciente
function evaluate(patientId, answers) {
  const patient = getPatient(patientId)
  const sex = patient.sex
  return {
    answers: answers,
    score: calculateScore(answers.signs, sex),
    threshold: THRESHOLDS[sex],
  }
}

// registra uma nova triagem com a data de hoje
export function createScreening(patientId, answers, user) {
  const screening = {
    id: crypto.randomUUID(),
    patientId: patientId,
    professionalId: user.id,
    date: today(),
    // adiciona answers, score e threshold
    ...evaluate(patientId, answers),
  }
  db.screenings.push(screening)
  save()
  return screening
}

// edita a triagem e recalcula a pontuação
export function updateScreening(id, answers, user) {
  assertAdmin(user)
  const screening = db.screenings.find((s) => s.id === id)
  const newResult = evaluate(screening.patientId, answers)
  Object.assign(screening, newResult, { updatedBy: user.id, updatedAt: today() })
  save()
}

export function deleteScreening(id, user) {
  assertAdmin(user)
  db.screenings = db.screenings.filter((s) => s.id !== id)
  save()
}
