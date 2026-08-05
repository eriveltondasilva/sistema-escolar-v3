// server/web-app/do-get.ts
import { DIALOG_NAMES } from "#config/dialog-names.ts";
import { getErrorMsg } from "#utils/error.ts";
import { verifyReportLinkToken } from "#utils/link-token.ts";
import { renderView } from "#utils/render-view.ts";
import { findReportPdfId } from "./pdf-lookup.ts";

import type { ReportLinkParams } from "#types.ts";
import type { ErrorInitData, ReportDownloadInitData } from "./types.ts";

interface GetParams extends ReportLinkParams {
  token: string;
}

const REQUIRED_PARAMS: (keyof GetParams)[] = [
  "studentId",
  "year",
  "className",
  "token",
] as const;

const GENERIC_ERROR_MESSAGE =
  "Não foi possível localizar o boletim no momento. " +
  "Tente novamente mais tarde ou entre em contato com a secretaria da escola.";

function renderError(errorMessage: string): GoogleAppsScript.HTML.HtmlOutput {
  const initData: ErrorInitData = { errorMessage };
  const htmlOutput = renderView(DIALOG_NAMES.error, initData);

  return htmlOutput.setTitle("Erro no Sistema");
}

// -------------------------------------

export function doGet({
  parameter,
}: GoogleAppsScript.Events.DoGet): GoogleAppsScript.HTML.HtmlOutput {
  const params = parameter as unknown as GetParams;
  const missingParams = REQUIRED_PARAMS.filter((key) => !params[key]);

  if (missingParams.length > 0) {
    console.error(
      `[doGet] Parâmetros obrigatórios ausentes: ${missingParams.join(", ")}.`,
    );

    return renderError(GENERIC_ERROR_MESSAGE);
  }

  const { className, studentId, year } = params;

  let isTokenValid: boolean;
  try {
    isTokenValid = verifyReportLinkToken(params);
  } catch (error) {
    console.error(`[doGet] Falha ao validar token: ${getErrorMsg(error)}`);

    return renderError(GENERIC_ERROR_MESSAGE);
  }

  if (!isTokenValid) {
    console.error(
      "[doGet] Token inválido: " +
        `studentId="${studentId}", className="${className}", year="${year}".`,
    );

    return renderError(
      "Link inválido ou expirado. Solicite um novo link à secretaria da escola.",
    );
  }

  let reportPdfId: string | null;
  try {
    reportPdfId = findReportPdfId({ studentId, className, year });
  } catch (error) {
    console.error(
      "[doGet] Falha ao localizar boletim: " +
        `studentId="${studentId}", className="${className}", year="${year}".\n` +
        `Error: ${getErrorMsg(error)}`,
    );

    return renderError(GENERIC_ERROR_MESSAGE);
  }

  if (!reportPdfId) {
    console.error(
      `[doGet] Boletim não encontrado: ` +
        `studentId="${studentId}", className="${className}", year="${year}".`,
    );

    return renderError(GENERIC_ERROR_MESSAGE);
  }

  const initData: ReportDownloadInitData = {
    downloadUrl: `https://drive.google.com/uc?export=download&id=${reportPdfId}`,
  };
  const htmlOutput = renderView(DIALOG_NAMES.reportDownload, initData);

  return htmlOutput.setTitle("Boletim Escolar");
}
