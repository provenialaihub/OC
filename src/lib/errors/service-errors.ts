export type ServiceErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT';

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class UnauthorizedError extends ServiceError {
  constructor(message = 'You must be signed in to continue.', details?: Record<string, unknown>) {
    super('UNAUTHORIZED', message, details);
  }
}

export class PermissionDeniedError extends ServiceError {
  constructor(message = 'You do not have access to perform this action.', details?: Record<string, unknown>) {
    super('FORBIDDEN', message, details);
  }
}

export class ValidationError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NOT_FOUND', message, details);
  }
}

export class ConflictError extends ServiceError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('CONFLICT', message, details);
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ServiceError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}
