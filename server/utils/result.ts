// server/utils/result.ts
interface Ok<T> {
  ok: true;
  value: T;
}

interface Err<E> {
  ok: false;
  error: E;
}

export type Result<T, E = string | Error> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/** Executa fn e converte exceção (inclusive nativas do GAS) em Result. */
export function fromTry<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (error) {
    return err(Error.isError(error) ? error : new Error(String(error)));
  }
}

/** Type guard: true se o Result for Ok. Equivalente a `result.ok`. */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/** Type guard: true se o Result for Err. Equivalente a `!result.ok`. */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/** Retorna o valor de um Ok, ou `fallback` se for Err. Nunca lança. */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

export function errMsg(message: string, options?: ErrorOptions): Err<Error> {
  return err(new Error(message, options));
}
