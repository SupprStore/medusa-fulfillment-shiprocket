const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
])

const THREE_DECIMAL_CURRENCIES = new Set([
  'BHD',
  'IQD',
  'JOD',
  'KWD',
  'LYD',
  'OMR',
  'TND',
])

const getCurrencyDivisor = (currencyCode?: string): number => {
  if (!currencyCode) {
    return 100
  }

  const code = String(currencyCode).toUpperCase()

  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return 1
  }

  if (THREE_DECIMAL_CURRENCIES.has(code)) {
    return 1000
  }

  return 100
}

const normalizeAmount = (amount: number | null | undefined, currencyCode?: string): number => {
  const divisor = getCurrencyDivisor(currencyCode)
  const value = Number(amount || 0)
  return value / divisor
}

const getLineItemTotal = (item: any): number => {
  if (!item) {
    return 0
  }

  const quantity = Number(item.quantity || 0)

  if (item.original_total != null) {
    return Number(item.original_total || 0)
  }

  if (item.subtotal != null) {
    return Number(item.subtotal || 0)
  }

  if (item.total != null) {
    return Number(item.total || 0)
  }

  if (item.unit_price != null) {
    return Number(item.unit_price || 0) * quantity
  }

  return 0
}

const sumLineItemTotals = (items: any[] = []): number =>
  items.reduce((acc, item) => acc + getLineItemTotal(item), 0)

export { getCurrencyDivisor, normalizeAmount, getLineItemTotal, sumLineItemTotals }
