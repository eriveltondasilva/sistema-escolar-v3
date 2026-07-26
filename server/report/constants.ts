// server/report/columns.ts
import { formatGrade, formatStatus, formatValue } from "../utils/formatters.ts";

import type { AssessmentType, Subject, ValidClass } from "../types.ts";
import type { PlaceholderField } from "./types.ts";

/** Primeira linha de dados na aba "Resumo" (linha 1 = cabeçalho). */
export const SUMMARY_FIRST_DATA_ROW = 2;

/** Primeira linha de dados nas abas de disciplina (linha 1 = cabeçalho). */
export const FIRST_DATA_ROW = 2;

/** Índices (0-based) das colunas na aba "Alunos" do Cadastro de Alunos. */
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

/** Índices (0-based) das colunas nas abas de disciplina (ex.: "MAT", "LPO"). */
export const GRADE_COLUMNS = {
  studentId: 0,
  bimester1: 1,
  bimester2: 2,
  bimester3: 3,
  bimester4: 4,
  average: 5,
  status: 6,
} as const;

export const GRADE_COLUMNS_COUNT = Object.keys(GRADE_COLUMNS).length;

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

/**
 * Boletim de conceito: não tem recuperação nem médias (rs/ms/mf) — cada
 * bimestre e a situação final (sf) recebem um conceito (I/B/O/E) em vez de
 * nota numérica, por isso usam `formatValue` (sem casas decimais) em vez
 * de `formatGrade`/`formatStatus`.
 */
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
