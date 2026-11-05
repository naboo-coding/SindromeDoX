// traduz as mensagens de validação para português

// escolhe a mensagem pelo tipo de erro do campo
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

  if (validity.tooShort) {
    return `Use pelo menos ${field.minLength} caracteres (você digitou ${field.value.length}).`
  }

  if (validity.badInput && field.type === 'date') {
    return 'Digite uma data válida.'
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

// ativa as mensagens em todos os formulários
export function enablePortugueseValidationMessages() {
  document.addEventListener('invalid', handleInvalid, true)
  document.addEventListener('input', handleChange, true)
  document.addEventListener('change', handleChange, true)
}
