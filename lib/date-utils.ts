// Parsea una fecha evitando el corrimiento de día que ocurre con strings "YYYY-MM-DD":
// `new Date("2026-07-11")` se interpreta como medianoche UTC, y en un navegador con
// huso horario negativo (Perú, UTC-5) eso cae en el día anterior (10/07). Para esos
// strings de solo fecha, los construimos como medianoche LOCAL en su lugar.
export const toLocalDate = (date: string | Date): Date => {
  if (typeof date === 'string') {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (match) {
      const [, y, m, d] = match
      return new Date(Number(y), Number(m) - 1, Number(d))
    }
  }
  return new Date(date)
}

// Convierte una fecha (string ISO o Date) a YYYY-MM-DD usando la hora local del navegador
export const toLocalDateStr = (date: string | Date) => {
  const d = toLocalDate(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const formatDebtDate = (date: string | Date) =>
  new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(toLocalDate(date))
