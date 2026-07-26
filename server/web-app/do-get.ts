// server/web-app/do-get.ts
import { DIALOG_NAMES } from "../dialog-names.ts";
import { findReportPdfId } from "./pdf-lookup.ts";
import { getErrorMsg } from "../utils/error.ts";
import { verifyReportLinkToken } from "../utils/link-token.ts";
import { renderView } from "../utils/render-view.ts";

import type { ReportLinkParams } from "../types.ts";
import type { ErrorInitData, ReportDownloadInitData } from "./types.ts";

interface GetParams extends ReportLinkParams {
  token: string;
}

const REQUIRED_PARAMS: (keyof GetParams)[] = [
  "studentId",
  "year",
  "className",
  "token",
];
const STUDENT_ID_PATTERN = /^[A-Za-z0-9]+$/;

const GENERIC_LOOKUP_ERROR_MESSAGE =
  "Não foi possível localizar o boletim no momento. Tente novamente mais " +
  "tarde ou entre em contato com a secretaria da escola.";

function renderError(errorMessage: string): GoogleAppsScript.HTML.HtmlOutput {
  const htmlOutput = renderView<ErrorInitData>(DIALOG_NAMES.error, {
    errorMessage,
  });

  return htmlOutput.setTitle("Erro no Sistema");
}

// -------------------------------------

export function doGet({
  parameter,
}: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const params = parameter as unknown as GetParams;
  const missingParams = REQUIRED_PARAMS.filter((key) => !params[key]);

  if (missingParams.length > 0) {
    return renderError(
      `Parâmetros obrigatórios ausentes: ${missingParams.join(", ")}. Por favor, tente novamente.`,
    );
  }

  const { className, studentId, year, token } = params;
  const reportLinkParams: ReportLinkParams = { studentId, year, className };

  if (!STUDENT_ID_PATTERN.test(studentId)) {
    return renderError(
      `Matrícula "${studentId}" inválida: use apenas letras e números.`,
    );
  }

  let isTokenValid: boolean;
  try {
    isTokenValid = verifyReportLinkToken(reportLinkParams, token);
  } catch (error) {
    const errorMessage = getErrorMsg(error);
    console.error(`[doGet] Falha ao validar token: ${errorMessage}`);

    return renderError(GENERIC_LOOKUP_ERROR_MESSAGE);
  }

  if (!isTokenValid) {
    console.error(
      `[doGet] Token inválido para studentId=${studentId}, year=${year}, className=${className}.`,
    );

    return renderError(
      "Link inválido ou expirado. Solicite um novo link à secretaria da escola.",
    );
  }

  let reportPdfId: string | null;
  try {
    reportPdfId = findReportPdfId(reportLinkParams);
  } catch (error) {
    const errorMessage = getErrorMsg(error);
    console.error(
      `[doGet] Falha ao localizar boletim (studentId=${studentId}, year=${year}, className=${className}): ${errorMessage}`,
    );

    return renderError(GENERIC_LOOKUP_ERROR_MESSAGE);
  }

  if (!reportPdfId) {
    return renderError(
      `O boletim ainda não foi gerado para a matrícula "${studentId}" na turma "${className}" (${year}).`,
    );
  }

  const htmlOutput = renderView<ReportDownloadInitData>(
    DIALOG_NAMES.reportDownload,
    {
      downloadUrl: `https://drive.google.com/uc?export=download&id=${reportPdfId}`,
    },
  );

  return htmlOutput.setTitle("Boletim Escolar");
}
