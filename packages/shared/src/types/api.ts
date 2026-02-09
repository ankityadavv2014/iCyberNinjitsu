export interface ListResponse<T> {
  items: T[];
}

export interface ApiError {
  code: string;
  message?: string;
}

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNPROCESSABLE: 'UNPROCESSABLE',
  WORKSPACE_PAUSED: 'WORKSPACE_PAUSED',
  CREDENTIAL_INVALID: 'CREDENTIAL_INVALID',
  RATE_LIMIT: 'RATE_LIMIT',
} as const;
