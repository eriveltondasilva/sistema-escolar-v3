// server/utils/render.ts
import type { DialogName } from "#server/dialog-names.js";

/** Renderiza um template HTML. */
export function renderView<T>(
  templateName: DialogName,
  initData?: T,
): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile(templateName);

  if (initData) template.initData = JSON.stringify(initData);

  return template.evaluate();
}
