import { ShiprocketError } from './errors'

export const formatShiprocketDate = (date: Date = new Date()): string =>
  date.toISOString().split('T')[0]

export const ensurePresent = <T>(
  value: T | null | undefined,
  message: string
): T => {
  if (value === null || value === undefined || value === '') {
    throw new ShiprocketError(message)
  }
  return value
}

export const toNumber = (value: unknown, label: string): number => {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    throw new ShiprocketError(`Shiprocket: ${label} must be a valid number.`)
  }
  return num
}

export const toInt = (value: unknown, label: string): number => {
  const num = parseInt(String(value), 10)
  if (Number.isNaN(num)) {
    throw new ShiprocketError(`Shiprocket: ${label} must be a valid integer.`)
  }
  return num
}

export const resolveCourierId = (data: any): string | number | undefined => {
  if (!data) return undefined
  return (
    data.id ||
    data.courier_id ||
    data.courier_company_id ||
    data.data?.id ||
    data.data?.courier_id ||
    data.data?.courier_company_id
  )
}

export const sumTaxRates = (taxLines: { rate: number }[] = []): number =>
  taxLines.reduce((acc, next) => acc + (Number(next?.rate) || 0), 0)
