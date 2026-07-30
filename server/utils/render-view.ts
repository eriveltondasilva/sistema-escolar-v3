// server/utils/render-view.ts
import type { DialogName } from "../dialog-names.ts";

/** Renderiza um template HTML. */
export function renderView<T>(
  templateName: DialogName,
  initData?: T,
): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile(templateName);
  if (initData !== undefined) template.initData = JSON.stringify(initData);

  return template.evaluate();
}
