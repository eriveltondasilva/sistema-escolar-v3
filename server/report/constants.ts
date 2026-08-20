// server/report/columns.ts
import { formatGrade, formatStatus, formatValue } from "#utils/formatters.ts";

import type { AssessmentType, Subject, ValidClass } from "../types.ts";
import type { PlaceholderField } from "./types.ts";

interface SheetSchema {
  readonly name: string;
  readonly startRow: number;
  readonly columns: Record<string, number>;
}

/** Aba "Alunos" do Cadastro Escolar. */
export const STUDENTS_SHEET = {
  name: "Alunos",
  startRow: 3,
  columns: {
    id: 0, // A - Matrícula
    name: 1, // B - Nome Completo
    address: 2, // C - Endereço
    nationality: 3, // D - Nacionalidade
    birthDate: 4, // E - Data de Nascimento
    enrollmentDate: 5, // F - Data de Matrícula
    sex: 6, // G - Sexo
    status: 7, // H - Status
  },
} as const satisfies SheetSchema;

/** Aba "Responsáveis" do Cadastro Escolar. */
export const GUARDIANS_SHEET = {
  name: "Responsáveis",
  startRow: 3,
  columns: {
    studentId: 0, // A - Matrícula
    name: 1, // B - Nome
    address: 2, // C - Endereço
    relationship: 3, // D - Parentesco
    isPrimary: 4, // E - R. Principal
    phone: 5, // F - Telefone
  },
} as const satisfies SheetSchema;

/** Aba "Resumo" da planilha de turma. */
export const SUMMARY_SHEET = {
  name: "Resumo",
  startRow: 3,
  columns: {
    studentId: 0, // A - Matrícula
    name: 1, // B - Nome
  },
} as const satisfies SheetSchema;

/** Aba de disciplina (nome = subject.code) — turmas com nota numérica. */
export const NUMERIC_GRADE_SHEET = {
  startRow: 4,
  columns: {
    studentId: 0, // A - Matrícula
    name: 1, // B - Nome
    grade1Q: 2, // C - Nota - 1Bim
    absences1Q: 3, // D - Faltas - 1Bim
    grade2Q: 4, // E - Nota - 2Bim
    absences2Q: 5, // F - Faltas - 2Bim
    makeup1S: 6, // G - Rec. - 1Sem
    average1S: 7, // H - Média - 1Sem
    grade3Q: 8, // I - Nota - 3Bim
    absences3Q: 9, // J - Faltas - 3Bim
    grade4Q: 10, // K - Nota - 4Bim
    absences4Q: 11, // L - Faltas - 4Bim
    makeup2S: 12, // M - Rec. - 2Sem
    average2S: 13, // N - Média - 2Sem
    totalAbsences: 14, // O - Totais Faltas
    finalGrade: 15, // P - Média Final
    status: 16, // Q - Situação Final
  },
} as const satisfies Omit<SheetSchema, "name">;

/** Aba de disciplina (nome = subject.code) — turmas com conceito. */
export const CONCEPT_GRADE_SHEET = {
  startRow: 4,
  columns: {
    studentId: 0, // A - Matrícula
    name: 1, // B - Nome
    grade1Q: 2, // C - Conceito - 1B.
    absences1Q: 3, // D - Faltas - 1B.
    grade2Q: 4, // E - Conceito - 2B.
    absences2Q: 5, // F - Faltas - 2B.
    grade3Q: 6, // G - Conceito - 3B.
    absences3Q: 7, // H - Faltas - 3B.
    grade4Q: 8, // I - Conceito - 4B.
    absences4Q: 9, // J - Faltas - 4B.
    totalAbsences: 10, // K - Totais Faltas
    status: 11, // L - Situação Final
  },
} as const satisfies Omit<SheetSchema, "name">;

export function getGradeColumns(assessmentType: AssessmentType) {
  return assessmentType === "numeric" ? NUMERIC_GRADE_SHEET : (
      CONCEPT_GRADE_SHEET
    );
}

/** Turmas únicas, não insira duas vezes o mesmo VALID_CLASSES.name. */
export const VALID_CLASSES: ValidClass[] = [
  {
    name: "2º Ano",
    stage: "Ensino Fundamental I",
    shift: "Matutino",
    assessmentType: "concept",
  },
  {
    name: "3º Ano",
    stage: "Ensino Fundamental I",
    shift: "Matutino",
    assessmentType: "concept",
  },
  {
    name: "4º Ano",
    stage: "Ensino Fundamental I",
    shift: "Matutino",
    assessmentType: "concept",
  },
  {
    name: "5º Ano",
    stage: "Ensino Fundamental I",
    shift: "Matutino",
    assessmentType: "numeric",
  },
  {
    name: "6º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "numeric",
  },
  {
    name: "7º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "numeric",
  },
  {
    name: "8º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "numeric",
  },
  {
    name: "9º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "numeric",
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
  return assessmentType === "numeric" ?
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
  return assessmentType === "numeric" ?
      GRADE_MANUAL_SUFFIXES
    : CONCEPT_MANUAL_SUFFIXES;
}
