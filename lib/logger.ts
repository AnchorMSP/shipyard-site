// Single structured logger for shipyard-web. Emits one JSON line per call so
// Vercel runtime logs stay queryable and clusterable without adding a logging
// dependency. Messages are constant strings; dynamic values live in fields.
type LogLevel = 'info' | 'error'

interface LogFields {
  error?: unknown
  [key: string]: unknown
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause
    return {
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
      ...(cause !== undefined ? { cause: serializeError(cause) } : {}),
    }
  }
  return { name: typeof error, message: String(error) }
}

function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
  const { error, ...rest } = fields
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'shipyard-web',
    environment: process.env.NODE_ENV ?? 'development',
    ...rest,
  }
  if (error !== undefined) {
    entry.error = serializeError(error)
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    emit('info', message, fields)
  },
  error(message: string, fields?: LogFields): void {
    emit('error', message, fields)
  },
}