// server/roster/menu-actions.ts
export function openStudentSearchDialog(): void {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("student-search");
  const htmlOutput = template.evaluate().setWidth(480).setHeight(560);
  ui.showModalDialog(htmlOutput, "Buscar Aluno");
}

export function openStudentRegistrationDialog(): void {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("student-registration");
  const htmlOutput = template.evaluate().setWidth(480).setHeight(620);
  ui.showModalDialog(htmlOutput, "Cadastrar Aluno");
}

export function openStudentEditDialog(studentId: string): void {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("student-edit");
  template.studentId = trimmedId;
  const htmlOutput = template.evaluate().setWidth(480).setHeight(620);
  ui.showModalDialog(htmlOutput, "Editar Aluno");
}
