// server/report/columns.ts
import { formatGrade, formatStatus, formatValue } from "../utils/formatters.ts";

import type { AssessmentType, Subject, ValidClass } from "../types.ts";
import type { PlaceholderField } from "./types.ts";

/** Primeira linha de dados na aba "Resumo" (linha 1 = cabeçalho). */
export const SUMMARY_FIRST_DATA_ROW = 2;

/** Primeira linha de dados nas abas de disciplina (linha 1 = cabeçalho). */
export const FIRST_DATA_ROW = 2;


const ROSTER_FIRST_DATA_ROW = 3
// const SUMMARY_FIRST_DATA_ROW = 3
const  SUBJECT_FIRST_DATA_ROW = 4

const ENROLLMENT_FIRST_DATA_ROW = {
  studentSheet: 3,
  guardianSheet: 2
}

/** Índices (0-based) das colunas na aba "Alunos" do Cadastro Escolar. */
export const STUDENT_COLUMNS = {
  id: 0,
  name: 1,
  address: 2,
  nationality: 3,
  birthDate: 4,
  enrollmentDate: 5,
  sex: 6,
  status: 7,
} as const;

/** Índices (0-based) das colunas na aba "Responsáveis". */
export const GUARDIAN_COLUMNS = {
  studentId: 0,
  name: 1,
  address: 2,
  relationship: 3,
  isPrimary: 4,
  phone: 5,
} as const;

/** Índices (0-based) das colunas na aba de disciplina — turmas com nota numérica. */
export const GRADE_COLUMNS_NUMERIC = {
  studentId: 0,
  grade1Q: 1,
  absences1Q: 2,
  grade2Q: 3,
  absences2Q: 4,
  makeup1S: 5,
  average1S: 6,
  grade3Q: 7,
  absences3Q: 8,
  grade4Q: 9,
  absences4Q: 10,
  makeup2S: 11,
  average2S: 12,
  finalGrade: 13,
  totalAbsences: 14,
  status: 15,
} as const;

/** Índices (0-based) das colunas na aba de disciplina — turmas com conceito. */
export const GRADE_COLUMNS_CONCEPT = {
  studentId: 0,
  grade1Q: 1,
  absences1Q: 2,
  grade2Q: 3,
  absences2Q: 4,
  grade3Q: 5,
  absences3Q: 6,
  grade4Q: 7,
  absences4Q: 8,
  totalAbsences: 9,
  status: 10,
} as const;

export function getGradeColumns(assessmentType: AssessmentType) {
  return assessmentType === "grade" ?
      GRADE_COLUMNS_NUMERIC
    : GRADE_COLUMNS_CONCEPT;
}

export function getGradeColumnsCount(assessmentType: AssessmentType): number {
  return Object.keys(getGradeColumns(assessmentType)).length;
}

/** Turmas únicas, não insira duas vezes o mesmo className. */
export const VALID_CLASSES: ValidClass[] = [
  {
    className: "6º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
  {
    className: "7º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
  {
    className: "8º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
  {
    className: "9º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
];

/** Disciplinas únicas, não insira duas vezes o mesmo code. */
export const VALID_SUBJECTS: Subject[] = [
  { name: "Arte", code: "ART" },
  { name: "Ciências", code: "CIE" },
  { name: "Educação Física", code: "EDF" },
  { name: "Ensino Religioso", code: "REL" },
  { name: "Geografia", code: "GEO" },
  { name: "História", code: "HIS" },
  { name: "Língua Inglesa", code: "ING" },
  { name: "Língua Portuguesa", code: "LPO" },
  { name: "Matemática", code: "MAT" },
] as const;

export const GRADE_PLACEHOLDER_FIELDS: PlaceholderField[] = [
  { suffix: "n1", field: "grade1Q", format: formatGrade },
  { suffix: "f1", field: "absences1Q", format: formatValue },
  { suffix: "n2", field: "grade2Q", format: formatGrade },
  { suffix: "f2", field: "absences2Q", format: formatValue },
  { suffix: "rs1", field: "makeup1S", format: formatGrade },
  { suffix: "ms1", field: "average1S", format: formatGrade },
  { suffix: "n3", field: "grade3Q", format: formatGrade },
  { suffix: "f3", field: "absences3Q", format: formatValue },
  { suffix: "n4", field: "grade4Q", format: formatGrade },
  { suffix: "f4", field: "absences4Q", format: formatValue },
  { suffix: "rs2", field: "makeup2S", format: formatGrade },
  { suffix: "ms2", field: "average2S", format: formatGrade },
  { suffix: "mf", field: "finalGrade", format: formatGrade },
  { suffix: "tf", field: "totalAbsences", format: formatValue },
  { suffix: "sf", field: "status", format: formatStatus },
];

export const CONCEPT_PLACEHOLDER_FIELDS: PlaceholderField[] = [
  { suffix: "c1", field: "grade1Q", format: formatValue },
  { suffix: "f1", field: "absences1Q", format: formatValue },
  { suffix: "c2", field: "grade2Q", format: formatValue },
  { suffix: "f2", field: "absences2Q", format: formatValue },
  { suffix: "c3", field: "grade3Q", format: formatValue },
  { suffix: "f3", field: "absences3Q", format: formatValue },
  { suffix: "c4", field: "grade4Q", format: formatValue },
  { suffix: "f4", field: "absences4Q", format: formatValue },
  { suffix: "tf", field: "totalAbsences", format: formatValue },
  { suffix: "sf", field: "status", format: formatValue },
];

/** Escolhe o conjunto de placeholders de acordo com o tipo de avaliação da turma. */
export function getPlaceholderFields(
  assessmentType: AssessmentType,
): PlaceholderField[] {
  return assessmentType === "grade" ?
      GRADE_PLACEHOLDER_FIELDS
    : CONCEPT_PLACEHOLDER_FIELDS;
}

/**
 * Sufixos de PLACEHOLDER_FIELDS que são preenchidos manualmente pelo
 * professor nas abas de disciplina. Os demais campos são fórmula (calculados
 * a partir dos manuais) e devem ficar bloqueados quando a aba é protegida.
 */
export const GRADE_MANUAL_SUFFIXES = new Set([
  "n1",
  "f1",
  "n2",
  "f2",
  "rs1",
  "n3",
  "f3",
  "n4",
  "f4",
  "rs2",
]);

export const CONCEPT_MANUAL_SUFFIXES = new Set([
  "c1",
  "f1",
  "c2",
  "f2",
  "c3",
  "f3",
  "c4",
  "f4",
  "sf",
]);

/** Escolhe o conjunto de sufixos de entrada manual de acordo com o tipo de avaliação da turma. */
export function getManualSuffixes(assessmentType: AssessmentType): Set<string> {
  return assessmentType === "grade" ?
      GRADE_MANUAL_SUFFIXES
    : CONCEPT_MANUAL_SUFFIXES;
}
