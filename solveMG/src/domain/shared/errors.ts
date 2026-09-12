export abstract class DomainError extends Error {
  abstract readonly code: string;
  readonly statusCode: number;

  protected constructor(message: string, statusCode = 400) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
  constructor(message: string) { super(message); }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
  constructor(message: string) { super(message, 404); }
}

export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
  constructor(message: string) { super(message, 409); }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED';
  constructor(message = 'Authentication required') { super(message, 401); }
}

export class ForbiddenError extends DomainError {
  readonly code = 'FORBIDDEN';
  constructor(message = 'Insufficient permissions') { super(message, 403); }
}