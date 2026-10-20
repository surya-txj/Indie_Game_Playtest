export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }
  static unauthenticated(message = 'Authentication required') {
    return new ApiError(401, 'UNAUTHENTICATED', message);
  }
  static forbidden(message = 'You do not have permission to do this') {
    return new ApiError(403, 'FORBIDDEN', message);
  }
  static notFound(what = 'Resource') {
    return new ApiError(404, 'NOT_FOUND', `${what} not found`);
  }
  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
  static gone(message) {
    return new ApiError(410, 'GONE', message);
  }
  static locked(message) {
    return new ApiError(423, 'LOCKED', message);
  }
}
