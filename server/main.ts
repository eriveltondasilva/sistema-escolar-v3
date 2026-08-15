// server/main.ts
import { onOpen } from "./menu.ts";
import {
  cancelClassReportsGeneration,
  continueClassReportsGeneration,
  executeClassReportsGeneration,
  executeStudentReportGeneration,
  getStudentsDataForClass,
} from "./report/dialog-actions.ts";
import {
  generateClassReports,
  generateStudentReport,
} from "./report/menu-actions.ts";
import {
  getStudentDetailsForSearch,
  getStudentForEditForm,
  getStudentSearchResults,
  submitStudentEdit,
  submitStudentRegistration,
} from "./roster/dialog-actions.ts";
import {
  openStudentCreationDialog,
  openStudentEditDialog,
  openStudentSearchDialog,
} from "./roster/menu-actions.ts";
import { submitSchoolYearCreation } from "./school-year/dialog-actions.ts";
import { openCreateSchoolYearFormDialog } from "./school-year/menu-actions.ts";
import { checkSystem } from "./system-check/checker.ts";

Object.assign(globalThis, {
  // --- Menu (onOpen) ---
  // Menu principal da planilha (onOpen) — não pertence a nenhum domínio.
  _onOpen: onOpen,

  // --- Boletim: menu ---
  // Domínio "Boletim": geração individual e em lote.
  _generateStudentReport: generateStudentReport, // abre o dialog de seleção (ano/turma/aluno)
  _generateClassReports: generateClassReports, // abre o dialog de seleção (ano/turma, turma toda)

  // --- Boletim: dialog (google.script.run) ---
  _getStudentsDataForClass: getStudentsDataForClass, // autocomplete de aluno no form de boletim individual
  _executeClassReportsGeneration: executeClassReportsGeneration, // gera os boletins de uma turma inteira
  _continueClassReportsGeneration: continueClassReportsGeneration, // retoma a geração de boletins em andamento
  _cancelClassReportsGeneration: cancelClassReportsGeneration, // cancela a geração de boletins em andamento
  _executeStudentReportGeneration: executeStudentReportGeneration, // gera o boletim de um único aluno

  // --- Diagnóstico: menu ---
  // Domínio "Diagnóstico": verificação agregada de config, pastas, planilhas e cadastro.
  _checkSystem: checkSystem, // roda a verificação completa e mostra o relatório

  // --- Aluno: menu ---
  _openStudentSearchDialog: openStudentSearchDialog, // abre a tela de busca de aluno
  _openStudentCreationDialog: openStudentCreationDialog, // abre o formulário de cadastro

  // --- Aluno: dialog (google.script.run) ---
  _openStudentEditDialog: openStudentEditDialog, // abre o formulário de edição a partir da busca
  _getStudentSearchResults: getStudentSearchResults, // autocomplete da tela de busca
  _getStudentDetailsForSearch: getStudentDetailsForSearch, // detalhes + histórico de PDFs do aluno selecionado
  _getStudentForEditForm: getStudentForEditForm, // carrega os dados do aluno no formulário de edição
  _submitStudentRegistration: submitStudentRegistration, // cria um novo aluno, devolve a matrícula gerada
  _submitStudentEdit: submitStudentEdit, // atualiza os dados de um aluno existente

  // --- Ano Letivo: menu ---
  _openCreateSchoolYearFormDialog: openCreateSchoolYearFormDialog, // abre o formulário de criação de ano letivo

  // --- Ano Letivo: dialog (google.script.run) ---
  _submitSchoolYearCreation: submitSchoolYearCreation, // valida e cria a estrutura do ano letivo (tudo ou nada)
});
