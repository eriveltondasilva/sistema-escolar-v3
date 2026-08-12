// server/menu.ts
export function onOpen(): void {
  SpreadsheetApp.getUi()
    //
    .createMenu("Sistema Escolar")
    //
    .addSeparator()
    .addItem("Buscar aluno", "openStudentSearchDialog")
    .addItem("Cadastrar aluno", "openStudentCreationDialog")
    //
    .addItem("Gerar boletim do aluno", "generateStudentReport")
    .addItem("Gerar boletins da turma", "generateClassReports")
    //
    .addSeparator()
    .addItem("Criar ano letivo", "openCreateSchoolYearDialog")
    .addItem("Verificar sistema", "checkSystem")
    //
    .addToUi();
}
