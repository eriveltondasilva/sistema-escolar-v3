// client/types.ts
import type { StudentSearchDetails as ServerStudentSearchDetails } from "#server/roster/dialog-actions.ts";
import type { ClassMatriculationInput } from "#server/school-year/types.ts";
import type { StudentSummary } from "#server/types.ts";

/**
 * Tipos deste arquivo são aliases dos tipos reais do server — o server é
 * a fonte única; o client só reexporta com o nome que faz sentido no
 * contexto de cada dialog, sem redefinir a forma.
 */
export type MatriculationInput = ClassMatriculationInput;

export type StudentOption = StudentSummary;

export type StudentSearchDetails = ServerStudentSearchDetails;
