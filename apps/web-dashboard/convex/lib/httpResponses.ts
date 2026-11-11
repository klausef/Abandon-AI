const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  })
}

export interface ErrorBody {
  ok: false
  error: {
    code: string
    message: string
    issues?: readonly string[]
  }
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: readonly string[],
): Response {
  const body: ErrorBody = {
    ok: false,
    error: issues && issues.length > 0 ? { code, message, issues } : { code, message },
  }
  return jsonResponse(status, body)
}
