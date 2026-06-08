const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

export function formatBRL(value: number) {
  return brlFormatter.format(value)
}

export function formatBRLOrDash(value: number | null | undefined) {
  if (value == null) {
    return '-'
  }

  return formatBRL(value)
}
