export class ValidationError extends Error {
  readonly errors: string[];

  constructor(errors: string[], message = "输入不合法") {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export class NotFoundError extends Error {
  constructor(what: string, id: string) {
    super(`${what} 不存在：${id}`);
    this.name = "NotFoundError";
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
