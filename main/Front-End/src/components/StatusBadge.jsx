// etiqueta com o resultado da triagem
import { STATUS, screeningStatus } from '../utils/score'

export default function StatusBadge({ screening }) {
  // pega o texto e a cor da situação da triagem
  const statusKey = screeningStatus(screening)
  const status = STATUS[statusKey]

  return <span className={`badge badge-${status.tone}`}>{status.label}</span>
}
