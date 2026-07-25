// server/action-response.ts
/**
 * Resultado padronizado para operações disparadas pelo menu, onde o
 * destino final é um `ui.alert` (categoria A — ver cabeçalho de Config.ts).
 */
interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
}

interface FailureResponse {
  success: false;
  message: string;
  details?: string;
}

export type ActionResponse<T = unknown> = SuccessResponse<T> | FailureResponse;

export function successResponse<T>(
  message: string,
  data: T,
): SuccessResponse<T> {
  return { success: true, message, data };
}

export function failureResponse(
  message: string,
  details?: string,
): FailureResponse {
  return {
    success: false,
    message,
    details,
  };
}
