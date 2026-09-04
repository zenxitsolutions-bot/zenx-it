export class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    if (details) this.details = details
  }
}

export const badRequest = (message, details) => new ApiError(400, message, details)
export const unauthorized = (message) => new ApiError(401, message)
export const forbidden = (message) => new ApiError(403, message)

export default ApiError
