export class FouadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'FouadError';
  }
}
export const normalizeError = (error: unknown): FouadError =>
  error instanceof FouadError
    ? error
    : new FouadError('UNKNOWN', error instanceof Error ? error.message : String(error));
