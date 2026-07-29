// client/utils.ts
import type { StudentFormPayload } from "#server/types.ts";

// 1. Interface contendo as funções do Google Apps Script (Backend)
export interface GasServerFunctions {
  myServerFunction(data: string, param: string): void;
  getUserData(userId: number): void;
}

export function runServerAction<TReturn = void, TServer = GasServerFunctions>(
  actionCallback: (server: TServer) => void,
): Promise<TReturn> {
  return new Promise<TReturn>((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject);

    // Fazemos um cast para a interface do servidor para habilitar o autocomplete
    actionCallback(runner as unknown as TServer);
  });
}

/**
 * Valida o payload do formulário de aluno (cadastro ou edição).
 * Retorna a mensagem de erro do primeiro problema encontrado, ou null se válido.
 */
export function validateStudentForm(form: StudentFormPayload): string | null {
  if (!form.name.trim()) {
    return "Nome é obrigatório.";
  }

  const guardians = form.guardians.filter((guardian) => guardian.name.trim());

  if (guardians.length === 0) {
    return "Informe ao menos um responsável.";
  }

  return null;
}
