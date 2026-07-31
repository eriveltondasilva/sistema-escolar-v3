// client/utils.ts
import type { GuardianData } from "#server/types.ts";
import type { GasServerFunctions } from "./types.ts";

/**
 * Lê e parseia o `data-init` injetado pelo server (renderView).
 * Lança erro cedo se o atributo estiver ausente ou for JSON inválido,
 * em vez de deixar o Alpine quebrar depois com undefined.
 */
export function parseInitData<T>(el: HTMLElement): T {
  const raw = el.dataset.init;

  if (!raw) {
    throw new Error(
      `data-init ausente em <${el.tagName.toLowerCase()}>. ` +
        "Verifique se o server passou initData para renderView().",
    );
  }

  return JSON.parse(raw) as T;
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

const VALID_SEX_VALUES = ["F", "M"];

/**
 * Forma mínima aceita por validateStudentForm — compatível tanto com o
 * payload de criação (CreateStudentPayload) quanto com o de edição
 * (Omit<StudentFormPayload, "studentId" | "enrollmentDate">), sem
 * acoplar a validação a um dos dois tipos específicos.
 */
interface StudentFormLike {
  name: string;
  birthDate: string;
  sex: string;
  address: string;
  nationality: string;
  guardians: GuardianData[];
}

/**
 * Valida o payload do formulário de aluno (cadastro ou edição).
 * Retorna a mensagem de erro do primeiro problema encontrado, ou null se válido.
 */
export function validateStudentForm(form: StudentFormLike): string | null {
  if (!form.name.trim()) {
    return "Nome é obrigatório.";
  }

  if (!form.birthDate.trim()) {
    return "Data de nascimento é obrigatória.";
  }

  if (Number.isNaN(Date.parse(form.birthDate))) {
    return "Data de nascimento inválida.";
  }

  if (!VALID_SEX_VALUES.includes(form.sex)) {
    return "Selecione o sexo do aluno.";
  }

  if (!form.address.trim()) {
    return "Endereço é obrigatório.";
  }

  if (!form.nationality.trim()) {
    return "Nacionalidade é obrigatória.";
  }

  const guardians = form.guardians.filter((guardian) => guardian.name.trim());

  if (guardians.length === 0) {
    return "Informe ao menos um responsável.";
  }

  const incompleteGuardian = guardians.find(
    (guardian) => !guardian.relationship.trim() || !guardian.phone.trim(),
  );

  if (incompleteGuardian) {
    return `Preencha parentesco e telefone do responsável "${incompleteGuardian.name.trim()}".`;
  }

  if (!guardians.some((guardian) => guardian.isPrimary)) {
    return "Marque um responsável como principal.";
  }

  return null;
}
