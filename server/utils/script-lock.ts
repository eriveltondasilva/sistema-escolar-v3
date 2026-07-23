import { SCRIPT_LOCK_TIMEOUT_MS } from "#server/config.ts";

export function promptForValue(
  ui: GoogleAppsScript.Base.Ui,
  title: string,
  message: string,
): string | null {
  const response = ui.prompt(title, message, ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK) return null;
  return response.getResponseText().trim();
}

/**
 * Executa `action` sob um lock de script, evitando que duas execuções do
 * mesmo fluxo corram em paralelo (ex: dois usuários gerando boletins da
 * mesma turma ao mesmo tempo).
 */
export function withScriptLock(
  action: (ui: GoogleAppsScript.Base.Ui) => void,
  busyMessage: string,
): void {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(SCRIPT_LOCK_TIMEOUT_MS)) {
    ui.alert(busyMessage);
    return;
  }

  try {
    action(ui);
  } finally {
    lock.releaseLock();
  }
}
