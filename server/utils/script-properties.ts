// server/utils/script-properties.ts
import type { ClassReportJob } from "../report/types.ts";

/** Chaves válidas de Script Properties usadas no projeto. */
type ScriptPropertyKey = "WEB_APP_ID" | "REPORT_LINK_SECRET";
const CLASS_REPORT_JOB_KEY = "CLASS_REPORT_JOB";

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

export function loadClassReportJob(): ClassReportJob | null {
  const value =
    PropertiesService.getScriptProperties().getProperty(CLASS_REPORT_JOB_KEY);

  return value ? (JSON.parse(value) as ClassReportJob) : null;
}

export function saveClassReportJob(job: ClassReportJob): void {
  PropertiesService.getScriptProperties().setProperty(
    CLASS_REPORT_JOB_KEY,
    JSON.stringify(job),
  );
}

export function clearClassReportJob(): void {
  PropertiesService.getScriptProperties().deleteProperty(CLASS_REPORT_JOB_KEY);
}
