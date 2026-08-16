import {
  sanitizeDiagnostic,
  type Diagnostic,
  type DiagnosticCode,
} from '../infrastructure/platform/diagnostics';

export type Success<T> = Readonly<{
  ok: true;
  value: T;
}>;

export type Failure<E extends string = DiagnosticCode> = Readonly<{
  ok: false;
  error: Diagnostic & { code: E };
}>;

export type Result<T, E extends string = DiagnosticCode> = Success<T> | Failure<E>;

export type FailureOptions = Readonly<{
  message?: string;
  details?: unknown;
}>;

export function success<T>(value: T): Success<T> {
  return { ok: true, value };
}

export function failure<E extends string>(code: E, options?: FailureOptions): Failure<E> {
  void options;
  return { ok: false, error: sanitizeDiagnostic(code) as Diagnostic & { code: E } };
}

export const ok = success;
export const fail = failure;

export function isSuccess<T, E extends string>(result: Result<T, E>): result is Success<T> {
  return result.ok;
}

export function isFailure<T, E extends string>(result: Result<T, E>): result is Failure<E> {
  return !result.ok;
}
