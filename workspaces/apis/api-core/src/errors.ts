class BaseError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NetworkError extends BaseError {
  constructor(message?: string) {
    super(message);
  }
}

export class HttpError extends BaseError {
  statusCode = 0;
  constructor(message?: string) {
    super(message);
  }
}

export class ValidationError extends HttpError {
  readonly statusCode = 400;
  constructor(message?: string) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  readonly statusCode = 404;
  constructor(message?: string) {
    super(message);
  }
}

export class UnauthorizedError extends HttpError {
  readonly statusCode = 403;
  constructor(message?: string) {
    super(message);
  }
}

export class ConflictError extends HttpError {
  readonly statusCode = 409;
  constructor(message?: string) {
    super(message);
  }
}
