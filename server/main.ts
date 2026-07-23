/**
 * Ponto de entrada do bundle.
 *
 * O Apps Script executa o código num único escopo global e localiza
 * funções (onOpen, doGet, itens de menu, chamadas de google.script.run)
 * pelo NOME, no objeto global — ele não entende `import`/`export`. Como
 * este projeto usa módulos ES de verdade (import/export) para poder ser
 * dividido em arquivos, o bundler precisa gerar um único arquivo final; e
 * este arquivo aqui é responsável por pendurar no escopo global exatamente
 * as funções que o Apps Script precisa enxergar pelo nome.
 *
 * Qualquer função nova referenciada por nome em um menu, num gatilho, ou
 * em `google.script.run` no client precisa ser adicionada aqui também.
 */

// Menu principal da planilha (onOpen) — não pertence a nenhum domínio.
import { onOpen } from "./menu.js";

// Domínio "Boletim": geração individual e em lote.
import {
  executeClassReportsGeneration,
  executeStudentReportGeneration,
  getStudentsDataForClass,
} from "./report/dialog-actions.js";
import {
  generateClassReports,
  generateStudentReport,
} from "./report/menu-actions.js";

// Domínio "Aluno": busca, cadastro e edição do cadastro de alunos.
import {
  getStudentDetailsForSearch,
  getStudentForEditForm,
  getStudentSearchResults,
  openStudentEditDialog,
  submitStudentEdit,
  submitStudentRegistration,
} from "./roster/dialog-actions.js";
import {
  openStudentRegistrationDialog,
  openStudentSearchDialog,
} from "./roster/menu-actions.js";

// Domínio "Ano Letivo": criação da estrutura (pasta + planilhas) com matrícula em massa.
import { submitSchoolYearCreation } from "./school-year/dialog-actions.js";
import { openCreateSchoolYearFormDialog } from "./school-year/menu-actions.js";

// Domínio "Diagnóstico": verificação agregada de config, pastas, planilhas e cadastro.
import { checkSystem } from "./system-check/checker.js";

// Domínio "Web App": endpoint público de validação de boletim via QR code.
import { doGet } from "./web-app/doGet.js";

Object.assign(globalThis, {
  // --- Menu (onOpen) ---
  onOpen,

  // --- Web App público (sem autenticação, acessado via QR do boletim) ---
  doGet,

  // --- Boletim: menu ---
  generateStudentReport, // abre o dialog de seleção (ano/turma/aluno)
  generateClassReports, // abre o dialog de seleção (ano/turma, turma toda)

  // --- Boletim: dialog (google.script.run) ---
  getStudentsDataForClass, // autocomplete de aluno no form de boletim individual
  executeClassReportsGeneration, // gera os boletins de uma turma inteira
  executeStudentReportGeneration, // gera o boletim de um único aluno

  // --- Diagnóstico: menu ---
  checkSystem, // roda a verificação completa e mostra o relatório

  // --- Aluno: menu ---
  openStudentSearchDialog, // abre a tela de busca de aluno
  openStudentRegistrationDialog, // abre o formulário de cadastro

  // --- Aluno: dialog (google.script.run) ---
  openStudentEditDialog, // abre o formulário de edição a partir da busca
  getStudentSearchResults, // autocomplete da tela de busca
  getStudentDetailsForSearch, // detalhes + histórico de PDFs do aluno selecionado
  getStudentForEditForm, // carrega os dados do aluno no formulário de edição
  submitStudentRegistration, // cria um novo aluno, devolve a matrícula gerada
  submitStudentEdit, // atualiza os dados de um aluno existente

  // --- Ano Letivo: menu ---
  openCreateSchoolYearFormDialog, // abre o formulário de criação de ano letivo

  // --- Ano Letivo: dialog (google.script.run) ---
  submitSchoolYearCreation, // valida e cria a estrutura do ano letivo (tudo ou nada)
});
