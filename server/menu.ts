// server/menu.ts
export function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu("Sistema Escolar")
    //
    .addItem("Gerar boletim do aluno", "generateStudentReport")
    .addItem("Gerar boletins da turma", "generateClassReports")
    //
    .addSeparator()
    .addItem("Buscar aluno", "openStudentSearchDialog")
    .addItem("Cadastrar aluno", "openStudentCreationDialog")
    //
    .addSeparator()
    .addItem("Criar ano letivo", "openCreateSchoolYearFormDialog")
    .addItem("Verificar sistema", "checkSystem")
    //
    .addToUi();
}
