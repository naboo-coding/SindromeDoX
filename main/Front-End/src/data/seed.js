// dados fictícios do banco simulado, só para testes

// monta um paciente com valores padrão
function patient(id, name, birthDate, sex, ownerId = 'u1') {
  const nameParts = name.split(' ')
  const lastName = nameParts[nameParts.length - 1]
  return {
    id,
    name,
    birthDate,
    sex,
    ownerId,
    motherName: `Ana ${lastName}`,
    fatherName: '',
    guardian: `Ana ${lastName}`,
    kinship: 'Mãe',
    cpf: '123.456.789-00',
    city: 'Curitiba',
    state: 'PR',
    country: 'Brasil',
    whatsapp: '(41) 99999-0000',
    phone: '(41) 99999-0000',
    phone2: '',
    email: 'contato@exemplo.com',
  }
}

// monta as respostas com os sintomas marcados
function answers(signs) {
  return {
    dnaTest: 'no',
    dnaInterest: 'yes',
    autism: 'no',
    siblings: 'yes',
    familyDisability: 'unknown',
    familyMenopause: 'no',
    familyAtaxia: 'no',
    signs,
    otherText: '',
    observations: '',
  }
}

// monta uma triagem sem pontuação
function screening(id, patientId, date, threshold, signs, professionalId = 'u1') {
  return {
    id,
    patientId,
    professionalId,
    date,
    answers: answers(signs),
    score: null,
    threshold,
  }
}

export default {
  users: [
    { id: 'u1', name: 'Marina Souza', email: 'marina@institutobuko.org', password: '123456', role: 'professional', active: true },
    { id: 'u2', name: 'Carlos Menezes', email: 'carlos@institutobuko.org', password: '123456', role: 'admin', active: true },
    { id: 'u3', name: 'Luz Maria Romero', email: 'luz@institutobuko.org', password: '123456', role: 'admin', active: true },
    { id: 'u4', name: 'Paula Andrade', email: 'paula@institutobuko.org', password: '123456', role: 'professional', active: false },
  ],
  patients: [
    patient('p1', 'Lucas Almeida', '2012-03-12', 'M'),
    patient('p2', 'Beatriz Moreira', '2009-07-28', 'F'),
    patient('p3', 'Pedro Henrique Costa', '2015-01-04', 'M'),
    patient('p4', 'Sofia Ribeiro', '2010-11-19', 'F'),
    patient('p5', 'Gabriel Tavares', '2013-06-07', 'M'),
    patient('p6', 'Helena Castro', '2011-02-15', 'F'),
    patient('p7', 'Rafael Duarte', '2014-08-22', 'M', 'u4'),
  ],
  screenings: [
    screening('s1', 'p1', '2026-10-05', 0.56, ['intellectualDisability', 'learningDifficulty', 'macroorchidism', 'hyperactivity', 'aggressiveness']),
    screening('s2', 'p2', '2026-10-02', 0.55, ['intellectualDisability', 'hyperactivity', 'speechDelay']),
    screening('s3', 'p3', '2026-09-29', 0.56, ['attentionDeficit']),
    screening('s4', 'p4', '2026-09-21', 0.55, ['learningDifficulty', 'intellectualDisability', 'attentionDeficit', 'longFace']),
    screening('s5', 'p1', '2026-03-14', 0.56, ['speechDelay', 'learningDifficulty']),
    screening('s6', 'p6', '2026-08-10', 0.55, ['avoidsEyeContact', 'avoidsPhysicalContact']),
    screening('s7', 'p7', '2026-07-02', 0.56, ['repetitiveMovements', 'longFace'], 'u4'),
  ],
}
