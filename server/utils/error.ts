// server/utils/error.ts
export function getErrorMsg(error: unknown): string {
  return Error.isError(error) ? error.message : String(error);
}
