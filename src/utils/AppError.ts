type ErrorMeta = {
  logout?: boolean;
  validationError?: boolean;
  fields?: Record<string, string>;
  [key: string]: unknown;
};

export class AppError extends Error {
  statusCode: number;
  meta: ErrorMeta;

  constructor(message: string, statusCode: number, meta: ErrorMeta = {}) {
    super(message);
    this.statusCode = statusCode;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}
