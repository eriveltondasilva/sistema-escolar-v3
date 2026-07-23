// server/utils/script-properties.ts
import type { Result } from "./result.ts";

import { err, fromTry, isErr, ok } from "./result.ts";

/** Chaves válidas de Script Properties usadas no projeto. */
type ScriptPropertyKey = "WEB_APP_ID" | "REPORT_LINK_SECRET";

/**
 * Lê uma propriedade obrigatória do script (Extensões > Apps Script >
 * Configurações do Projeto > Propriedades do script). Retorna erro
 * descritivo — incluindo a chave e a instrução de onde configurar —
 * se a propriedade não existir.
 */
export function getScriptProp(key: ScriptPropertyKey): Result<string> {
  // PropertiesService pode lançar nativamente (ex.: cota excedida).
  const propsResult = fromTry(() => PropertiesService.getScriptProperties());
  if (isErr(propsResult)) return propsResult;

  const props = propsResult.value;
  const value = props.getProperty(key);

  if (!value) {
    return err(
      `Propriedade de script "${key}" não configurada. Acesse ` +
        "Extensões > Apps Script > Configurações do Projeto > Propriedades " +
        `do script e adicione a chave "${key}" com o valor esperado.`,
    );
  }

  return ok(value);
}
