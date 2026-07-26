// server/school-year/types.ts
/**
 * Tipos do domínio "Ano Letivo": criação da estrutura (pasta + planilhas de
 * turma) e matrícula em massa dos alunos por turma nesse momento.
 */

/** Matrículas coladas pelo usuário para uma turma, na criação do ano letivo. */
export interface ClassMatriculationInput {
  className: string;
  studentIds: string[];
}

/** Resultado da criação de um ano letivo, usado pelo dialog de resultado. */
export interface CreateSchoolYearData {
  schoolYearLabel: string;
  createdClasses: string[];
  folderUrl: string;
}

/** Payload de create-school-year-form.html. */
export interface CreateSchoolYearFormInitData {
  classNames: string[];
}

/** Payload de create-school-year-result.html. */
export interface CreateSchoolYearResultInitData {
  schoolYearLabel: string;
  createdClasses: string[];
  folderUrl: string;
}
