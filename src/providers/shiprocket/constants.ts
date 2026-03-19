export const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external'

// Shiprocket tokens are valid for up to 10 days (240 hours).
export const TOKEN_TTL_MS = 10 * 24 * 60 * 60 * 1000

export const DEFAULT_RATE_LIMIT = {
  maxRequests: 2,
  perMilliseconds: 1000,
}

export const DEFAULT_RETRIES = 3
