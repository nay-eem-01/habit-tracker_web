/** The error body every endpoint returns (backend `HttpResponse`). Branch on `errorCode`, not the message. */
export class ApiError extends Error {
  readonly status: number
  readonly errorCode: string | null
  readonly fields: Record<string, string> | null
  readonly correlationId: string | null

  constructor(
    status: number,
    errorCode: string | null,
    message: string,
    fields: Record<string, string> | null = null,
    correlationId: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
    this.fields = fields
    this.correlationId = correlationId
  }
}
