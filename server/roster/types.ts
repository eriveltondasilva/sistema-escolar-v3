// server/roster/types.ts
import type { GuardianData, StudentData, StudentSummary } from "#types.ts";

/**
 * Dados de um aluno para o formulário de cadastro/edição — estende
 * StudentData (já usado por report/*.ts) só com o que o formulário
 * precisa além disso: a matrícula (que em StudentData nunca aparece, pois
 * lá ela é a CHAVE do Map, não um campo do valor) e a lista de
 * responsáveis com todos os dados (endereço, parentesco, telefone e quem
 * é o principal) — StudentData/PersonalData só tem a versão já
 * concatenada em texto, usada no boletim.
 */
export interface StudentFormPayload extends StudentData {
  studentId: string;
  guardians: GuardianData[];
}

/**
 * Payload enviado pelo client ao criar um aluno.
 * - studentId: gerado pelo servidor (ver generateNextStudentId).
 * - enrollmentDate: preenchida automaticamente pelo servidor com a data
 *   da criação — o client nunca informa isso.
 * - status: sempre "Ativo" na criação, decidido pelo servidor; o client
 *   não escolhe o status inicial (só edita depois, via submitStudentEdit).
 */
export type CreateStudentPayload = Omit<
  StudentFormPayload,
  "studentId" | "enrollmentDate" | "status"
>;

/** Resultado de uma busca de aluno (nome ou matrícula) — usado no autocomplete da tela de busca. */
export type StudentSearchResult = StudentSummary;

/**
 * Payload de student-edit.html. studentId vai aqui (não mais como
 * scriptlet solto) para manter todo dialog seguindo o mesmo padrão de
 * renderView — ver decisão pendente sobre studentId no student-edit.
 */
export interface StudentEditInitData {
  studentId: string;
}
