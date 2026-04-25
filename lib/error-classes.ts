export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class PermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentError';
  }
}
