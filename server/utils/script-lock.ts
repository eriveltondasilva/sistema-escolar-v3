// server/utils/script-lock.ts
import { SCRIPT_LOCK_TIMEOUT_MS } from "../config.ts";

/**
 * Adquire o lock do script antes de rodar `fn`, garantindo que duas
 * execuções concorrentes (ex.: dois cliques rápidos no botão do dialog)
 * não gerem boletins ao mesmo tempo. Libera o lock mesmo se `fn` lançar.
 *
 * Se o lock não for adquirido dentro de `SCRIPT_LOCK_TIMEOUT_MS`, mostra
 * `busyMessage` via `ui.alert` e retorna sem executar `fn`.
 */
export function withScriptLock(
  fn: (ui: GoogleAppsScript.Base.Ui) => void,
  busyMessage: string,
): void {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(SCRIPT_LOCK_TIMEOUT_MS)) {
    ui.alert(busyMessage);
    return;
  }

  try {
    fn(ui);
  } finally {
    lock.releaseLock();
  }
}
