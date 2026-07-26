// server/utils/script-properties.ts

/** Chaves válidas de Script Properties usadas no projeto. */
type ScriptPropertyKey = "WEB_APP_ID" | "REPORT_LINK_SECRET";

function getScriptProp(key: ScriptPropertyKey): string {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(key);

  if (!value) {
    throw new Error(
      `Propriedade de script "${key}" não configurada. Acesse ` +
        "Extensões > Apps Script > Configurações do Projeto > Propriedades " +
        `do script e adicione a chave "${key}" com o valor esperado.`,
    );
  }

  return value;
}

export function getWebAppId(): string {
  return getScriptProp("WEB_APP_ID");
}

export function getReportLinkSecret(): string {
  return getScriptProp("REPORT_LINK_SECRET");
}
