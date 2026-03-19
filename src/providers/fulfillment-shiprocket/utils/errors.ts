export type ShiprocketErrorOptions = {
  code?: string
  statusCode?: number
  details?: unknown
  cause?: unknown
}

export class ShiprocketError extends Error {
  public code?: string
  public statusCode?: number
  public details?: unknown
  public cause?: unknown

  constructor(message: string, options: ShiprocketErrorOptions = {}) {
    super(message)
    this.name = 'ShiprocketError'
    this.code = options.code
    this.statusCode = options.statusCode
    this.details = options.details
    this.cause = options.cause
  }
}
