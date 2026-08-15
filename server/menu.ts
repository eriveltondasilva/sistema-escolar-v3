// server/menu.ts
export function onOpen(): void {
  SpreadsheetApp.getUi()
    //
    .createMenu("Sistema Escolar")
    //
    .addItem("Buscar aluno", "openStudentSearchDialog")
    .addItem("Cadastrar aluno", "openStudentCreationDialog")
    .addSeparator()
    //
    .addItem("Gerar boletim do aluno", "generateStudentReport")
    .addItem("Gerar boletins da turma", "generateClassReports")
    .addSeparator()
    //
    .addItem("Criar ano letivo", "openCreateSchoolYearDialog")
    .addItem("Verificar sistema", "checkSystem")
    //
    .addToUi();
}
