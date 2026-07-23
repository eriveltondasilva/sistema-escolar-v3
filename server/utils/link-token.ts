// server/utils/link-token.ts
import type { Result } from "./result.ts";

import { fromTry, isErr, ok } from "./result.ts";
import { getScriptProp } from "./script-properties.ts";

interface ReportLinkParams {
  studentId: string;
  year: string;
  className: string;
}

/**
 * Gera o token de um link de boletim, a partir da secret configurada
 * em Script Properties (chave "REPORT_LINK_SECRET"). Nada é
 * armazenado por aluno: o mesmo token é recalculado sempre que
 * necessário, a partir dos mesmos parâmetros + secret.
 *
 * Trocar a secret invalida todos os links já emitidos de uma vez.
 */
export function generateReportLinkToken(
  params: ReportLinkParams,
): Result<string> {
  const secretResult = getScriptProp("REPORT_LINK_SECRET");
  if (isErr(secretResult)) return secretResult;

  const secret = secretResult.value;
  const payload = `${params.studentId}|${params.year}|${params.className}|${secret}`;

  // Utilities.* são chamadas nativas do GAS.
  const digestResult = fromTry(() =>
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload),
  );
  if (isErr(digestResult)) return digestResult;

  const digest = digestResult.value;
  const token = Utilities.base64EncodeWebSafe(digest);

  return ok(token);
}

/** Verifica se `token` corresponde aos parâmetros informados. */
export function verifyReportLinkToken(
  params: ReportLinkParams,
  token: string,
): Result<boolean> {
  const reportLinkToken = generateReportLinkToken(params);
  if (isErr(reportLinkToken)) return reportLinkToken;

  return ok(reportLinkToken.value === token);
}
