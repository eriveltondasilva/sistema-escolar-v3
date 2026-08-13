// server/utils/script-properties.ts
import type { ClassReportJob } from "../report/types.ts";

/** Chaves válidas de Script Properties usadas no projeto. */
type ScriptPropertyKey = "REPORT_LINK_SECRET";
const CLASS_REPORT_JOB_KEY = "CLASS_REPORT_JOB";

export function getScriptProp(key: ScriptPropertyKey): string {
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

export function loadClassReportJob(): ClassReportJob | null {
  const props = PropertiesService.getScriptProperties();
  const value = props.getProperty(CLASS_REPORT_JOB_KEY);

  if (!value) return null;

  try {
    return JSON.parse(value) as ClassReportJob;
  } catch (error) {
    PropertiesService.getScriptProperties().deleteProperty(
      CLASS_REPORT_JOB_KEY,
    );
    throw new Error(
      "O estado salvo da geração de boletins está inválido. Cancele a geração pendente e tente novamente.",
      { cause: error },
    );
  }
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
