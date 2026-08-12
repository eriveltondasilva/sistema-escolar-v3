// server/main.ts
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

export { onOpen } from "./menu.ts";
export {
  cancelClassReportsGeneration,
  continueClassReportsGeneration,
  executeClassReportsGeneration,
  executeStudentReportGeneration,
  getStudentsDataForClass,
} from "./report/dialog-actions.ts";
export {
  generateClassReports,
  generateStudentReport,
} from "./report/menu-actions.ts";
export {
  getStudentDetailsForSearch,
  getStudentForEditForm,
  getStudentSearchResults,
  submitStudentEdit,
  submitStudentRegistration,
} from "./roster/dialog-actions.ts";
export {
  openStudentCreationDialog,
  openStudentEditDialog,
  openStudentSearchDialog,
} from "./roster/menu-actions.ts";
export { submitSchoolYearCreation } from "./school-year/dialog-actions.ts";
export { openCreateSchoolYearDialog } from "./school-year/menu-actions.ts";
export { checkSystem } from "./system-check/checker.ts";
export { doGet } from "./web-app/do-get.ts";

// Object.assign(globalThis, {
//   // --- Menu (onOpen) ---
//   // Menu principal da planilha (onOpen) — não pertence a nenhum domínio.
//   onOpen: onOpen,

//   // --- Web App público (sem autenticação, acessado via QR do boletim) ---
//   doGet: doGet,

//   // --- Boletim: menu ---
//   // Domínio "Boletim": geração individual e em lote.
//   generateStudentReport: generateStudentReport, // abre o dialog de seleção (ano/turma/aluno)
//   generateClassReports: generateClassReports, // abre o dialog de seleção (ano/turma, turma toda)

//   // --- Boletim: dialog (google.script.run) ---
//   getStudentsDataForClass: getStudentsDataForClass, // autocomplete de aluno no form de boletim individual
//   executeClassReportsGeneration: executeClassReportsGeneration, // gera os boletins de uma turma inteira
//   continueClassReportsGeneration: continueClassReportsGeneration,
//   cancelClassReportsGeneration: cancelClassReportsGeneration,
//   executeStudentReportGeneration: executeStudentReportGeneration, // gera o boletim de um único aluno

//   // --- Diagnóstico: menu ---
//   // Domínio "Diagnóstico": verificação agregada de config, pastas, planilhas e cadastro.
//   checkSystem: checkSystem, // roda a verificação completa e mostra o relatório

//   // --- Aluno: menu ---
//   openStudentSearchDialog: openStudentSearchDialog, // abre a tela de busca de aluno
//   openStudentCreationDialog: openStudentCreationDialog, // abre o formulário de cadastro

//   // --- Aluno: dialog (google.script.run) ---
//   openStudentEditDialog: openStudentEditDialog, // abre o formulário de edição a partir da busca
//   getStudentSearchResults: getStudentSearchResults, // autocomplete da tela de busca
//   getStudentDetailsForSearch: getStudentDetailsForSearch, // detalhes + histórico de PDFs do aluno selecionado
//   getStudentForEditForm: getStudentForEditForm, // carrega os dados do aluno no formulário de edição
//   submitStudentRegistration: submitStudentRegistration, // cria um novo aluno, devolve a matrícula gerada
//   submitStudentEdit: submitStudentEdit, // atualiza os dados de um aluno existente

//   // --- Ano Letivo: menu ---
//   openCreateSchoolYearFormDialog: openCreateSchoolYearFormDialog, // abre o formulário de criação de ano letivo

//   // --- Ano Letivo: dialog (google.script.run) ---
//   submitSchoolYearCreation: submitSchoolYearCreation, // valida e cria a estrutura do ano letivo (tudo ou nada)
// });
