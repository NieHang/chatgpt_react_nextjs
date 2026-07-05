export class ApiError extends Error {
  status: number
  errorType: string

  constructor(message: string, status: number, errorType: string) {
    super(message)
    this.status = status
    this.errorType = errorType
    this.name = 'ApiError'
  }
}
