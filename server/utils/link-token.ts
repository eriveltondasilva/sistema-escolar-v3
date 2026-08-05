// server/utils/link-token.ts
import { getScriptProp } from "./script-properties.ts";

import type { ReportLinkParams } from "#types.ts";

export function generateReportLinkToken({
  className,
  studentId,
  year,
}: ReportLinkParams): string {
  const secret = getScriptProp("REPORT_LINK_SECRET");
  const payload = `${studentId}|${year}|${className}`;

  // Utilities.* são chamadas nativas do GAS.
  const signature = Utilities.computeHmacSha256Signature(payload, secret);

  return Utilities.base64EncodeWebSafe(signature);
}

interface VerifyReportLinkTokenParams extends ReportLinkParams {
  token: string;
}

export function verifyReportLinkToken(
  params: VerifyReportLinkTokenParams,
): boolean {
  return generateReportLinkToken(params) === params.token;
}
