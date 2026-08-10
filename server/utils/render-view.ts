// server/utils/render-view.ts
import type { DIALOG_NAMES } from "#config/constants.ts";

type DialogName = (typeof DIALOG_NAMES)[keyof typeof DIALOG_NAMES];

/** Renderiza um template HTML. */
export function renderView<T>(
  templateName: DialogName,
  initData?: T,
): GoogleAppsScript.HTML.HtmlOutput {
  const template = HtmlService.createTemplateFromFile(templateName);
  if (initData !== undefined) template.initData = JSON.stringify(initData);

  return template.evaluate();
}
