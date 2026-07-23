import type { ErrorInitData, ReportDownloadInitData } from "./types.ts";

import { DIALOG_NAMES } from "#server/dialog-names.ts";
import { verifyReportLinkToken } from "#server/utils/link-token.ts";
import { renderView } from "#server/utils/render-view.ts";
import { isErr } from "#server/utils/result.ts";

import { findReportPdfId } from "./pdf-lookup.ts";

interface GetParams {
  studentId: string;
  year: string;
  className: string;
  token: string;
}

const REQUIRED_PARAMS: (keyof GetParams)[] = [
  "studentId",
  "year",
  "className",
  "token",
];
const STUDENT_ID_PATTERN = /^[A-Za-z0-9]+$/;

// Mensagem genérica exibida ao usuário quando a busca falha por motivo
// técnico (config incompleta, pasta não encontrada, erro do Drive,
// etc.). O detalhe real vai só para o log — nunca para o HTML público.
const GENERIC_LOOKUP_ERROR_MESSAGE =
  "Não foi possível localizar o boletim no momento. Tente novamente mais " +
  "tarde ou entre em contato com a secretaria da escola.";

// Mensagem genérica para token ausente/inválido. Não diferencia "token
// errado" de "token ausente" para não dar dica a quem está tentando
// adivinhar/forjar um link.
const INVALID_TOKEN_MESSAGE =
  "Link inválido ou expirado. Solicite um novo link à secretaria da escola.";

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
    return renderError(
      `Parâmetros obrigatórios ausentes: ${missingParams.join(", ")}. Por favor, tente novamente.`,
    );
  }

  const { className, studentId, year, token } = params;

  if (!STUDENT_ID_PATTERN.test(studentId)) {
    return renderError(
      `Matrícula "${studentId}" inválida: use apenas letras e números.`,
    );
  }

  const tokenCheck = verifyReportLinkToken(
    { studentId, year, className },
    token,
  );

  if (isErr(tokenCheck)) {
    // Falha ao CALCULAR o token esperado (ex.: secret não configurada)
    // é erro de configuração do sistema, não do usuário — mas a
    // mensagem pública continua genérica por segurança.
    const technicalMessage =
      Error.isError(tokenCheck.error) ?
        tokenCheck.error.message
      : tokenCheck.error;
    console.error(`[doGet] Falha ao validar token: ${technicalMessage}`);

    return renderError(GENERIC_LOOKUP_ERROR_MESSAGE);
  }

  if (!tokenCheck.value) {
    console.error(
      `[doGet] Token inválido para studentId=${studentId}, year=${year}, className=${className}.`,
    );

    return renderError(INVALID_TOKEN_MESSAGE);
  }

  const reportPdfIdResult = findReportPdfId(studentId, year, className);

  if (isErr(reportPdfIdResult)) {
    // Detalhe técnico (pode conter ID de pasta, nome de planilha, etc.)
    // fica só no log do Apps Script — nunca é exposto ao usuário.
    const technicalMessage =
      Error.isError(reportPdfIdResult.error) ?
        reportPdfIdResult.error.message
      : reportPdfIdResult.error;
    console.error(
      `[doGet] Falha ao localizar boletim (studentId=${studentId}, year=${year}, className=${className}): ${technicalMessage}`,
    );

    return renderError(GENERIC_LOOKUP_ERROR_MESSAGE);
  }

  const reportPdfId = reportPdfIdResult.value;
  if (!reportPdfId) {
    return renderError(
      `O boletim ainda não foi gerado para a matrícula "${studentId}" na turma "${className}" (${year}).`,
    );
  }

  const initData: ReportDownloadInitData = {
    downloadUrl: `https://drive.google.com/uc?export=download&id=${reportPdfId}`,
  };
  const htmlOutput = renderView(DIALOG_NAMES.reportDownload, initData);

  return htmlOutput.setTitle("Boletim Escolar");
}
