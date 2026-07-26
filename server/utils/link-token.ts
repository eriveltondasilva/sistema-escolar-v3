// server/utils/link-token.ts
import { getReportLinkSecret } from "./script-properties.ts";

import type { ReportLinkParams } from "../types.ts";

/**
 * Gera o token de um link de boletim, a partir da secret configurada
 * em Script Properties (chave "REPORT_LINK_SECRET"). Nada é
 * armazenado por aluno: o mesmo token é recalculado sempre que
 * necessário, a partir dos mesmos parâmetros + secret.
 *
 * Trocar a secret invalida todos os links já emitidos de uma vez.
 */
export function generateReportLinkToken({
  className,
  studentId,
  year,
}: ReportLinkParams): string {
  const secret = getReportLinkSecret();
  const payload = `${studentId}|${year}|${className}|${secret}`;

  // Utilities.* são chamadas nativas do GAS.
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    payload,
  );

  return Utilities.base64EncodeWebSafe(digest);
}

/** Verifica se `token` corresponde aos parâmetros informados. */
export function verifyReportLinkToken(
  params: ReportLinkParams,
  token: string,
): boolean {
  return generateReportLinkToken(params) === token;
}
