// server/utils/link-token.ts
import { getReportLinkSecret } from "./script-properties.ts";

import type { ReportLinkParams } from "../types.ts";

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

export function verifyReportLinkToken(
  params: ReportLinkParams,
  token: string,
): boolean {
  return generateReportLinkToken(params) === token;
}
