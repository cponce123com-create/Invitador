// Logger de servidor: emite líneas JSON de un solo renglón para poder filtrar
// por nivel, `scope` y `requestId` en los logs de Render.
//
// No importa Prisma ni el SDK de Cloudinary, así que puede usarse desde
// cualquier módulo de servidor (rutas, `lib/rate-limit`, `lib/cloudinary`).

export type LogLevel = "info" | "warn" | "error";

/** Datos extra que acompañan a una línea de log. */
export type LogContext = {
  /** Identificador de correlación de la petición (ver `lib/http.ts`). */
  requestId?: string;
  /** Error capturado; se serializa sin filtrar detalles internos al cliente. */
  error?: unknown;
  [key: string]: unknown;
};

/** Convierte un valor capturado en un objeto serializable. */
export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
}

function write(
  level: LogLevel,
  scope: string,
  message: string,
  context: LogContext = {},
): void {
  const { error, ...rest } = context;
  const entry: Record<string, unknown> = {
    level,
    time: new Date().toISOString(),
    scope,
    message,
    ...rest,
  };
  if (error !== undefined) entry.error = serializeError(error);

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Registra un evento informativo. */
export function logInfo(
  scope: string,
  message: string,
  context?: LogContext,
): void {
  write("info", scope, message, context);
}

/** Registra una advertencia (por ejemplo, una degradación de seguridad). */
export function logWarn(
  scope: string,
  message: string,
  context?: LogContext,
): void {
  write("warn", scope, message, context);
}

/** Registra un error con su contexto y, si existe, el `requestId`. */
export function logError(
  scope: string,
  message: string,
  context?: LogContext,
): void {
  write("error", scope, message, context);
}
