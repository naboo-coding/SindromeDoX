// campos do cadastro do paciente

// dados pessoais do paciente e do responsável
export const PERSONAL_FIELDS = [
  { name: 'name', label: 'Nome do paciente', required: true },
  { name: 'birthDate', label: 'Data de nascimento', type: 'date', required: true },
  { name: 'sex', label: 'Sexo biológico', required: true, options: [['M', 'Masculino'], ['F', 'Feminino']] },
  { name: 'motherName', label: 'Nome da mãe', required: true },
  { name: 'fatherName', label: 'Nome do pai' },
  { name: 'guardian', label: 'Responsável pelo paciente', required: true },
  { name: 'kinship', label: 'Grau de parentesco com o paciente', required: true },
  { name: 'cpf', label: 'CPF do responsável', required: true, placeholder: '000.000.000-00' },
  { name: 'city', label: 'Cidade', required: true },
  { name: 'state', label: 'Estado', required: true },
  { name: 'country', label: 'País', required: true, defaultValue: 'Brasil' },
]

// contatos da família
export const CONTACT_FIELDS = [
  { name: 'whatsapp', label: 'WhatsApp', type: 'tel' },
  { name: 'phone', label: 'Telefone para ligações', type: 'tel', required: true },
  { name: 'phone2', label: 'Telefone 2', type: 'tel' },
  { name: 'email', label: 'E-mail', type: 'email', required: true },
]
