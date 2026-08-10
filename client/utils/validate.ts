// client/utils/validate.ts

import type { CreateStudentPayload } from "#server/roster/types.ts";

/**
 * Valida o payload do formulário de aluno (cadastro ou edição).
 * Retorna a mensagem de erro do primeiro problema encontrado, ou null se válido.
 */
export function validateStudentForm(form: CreateStudentPayload): string | null {
  if (!form.name.trim()) {
    return "Nome é obrigatório.";
  }

  if (!form.birthDate.trim()) {
    return "Data de nascimento é obrigatória.";
  }

  const guardians = form.guardians.filter((guardian) => guardian.name.trim());

  if (guardians.length === 0) {
    return "Informe ao menos um responsável.";
  }

  const incompleteGuardian = guardians.find(
    (guardian) => !guardian.relationship.trim(),
  );

  if (incompleteGuardian) {
    return `Preencha parentesco do responsável "${incompleteGuardian.name.trim()}".`;
  }

  if (!guardians.some((guardian) => guardian.isPrimary)) {
    return "Marque um responsável como principal.";
  }

  return null;
}
