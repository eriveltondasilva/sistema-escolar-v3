import type { Result } from "#server/utils/result.ts";

import { loadConfig } from "#server/config.ts";
import { err, errMsg, fromTry, isErr, ok } from "#server/utils/result.ts";

export function findReportPdfId(
  studentId: string,
  year: string,
  className: string,
): Result<string | null> {
  const configResult = loadConfig();
  if (isErr(configResult)) return configResult;

  const { pdfsFolderId } = configResult.value;

  const pdfFolderResult = fromTry(() => DriveApp.getFolderById(pdfsFolderId));
  if (isErr(pdfFolderResult)) {
    return errMsg(
      `Pasta de PDFs não encontrada (ID: "${pdfsFolderId}"). ` +
        `Verifique a configuração "PASTA_PDFS_ID".`,
      { cause: pdfFolderResult.error },
    );
  }

  const pdfFolder = pdfFolderResult.value;
  const yearFolderIterator = pdfFolder.getFoldersByName(year);

  if (!yearFolderIterator.hasNext()) {
    return err(
      `Pasta do ano letivo "${year}" não encontrada dentro de "${pdfFolder.getName()}".`,
    );
  }

  const yearFolder = yearFolderIterator.next();
  const classFolderIterator = yearFolder.getFoldersByName(className);

  if (!classFolderIterator.hasNext()) {
    return err(
      `Pasta da turma "${className}" não encontrada dentro do ano "${year}".`,
    );
  }

  const prefix = `${studentId}_`;
  const searchQuery = `title contains '${prefix}' and mimeType = 'application/pdf' and trashed = false`;
  const classFolder = classFolderIterator.next();

  const filesResult = fromTry(() => classFolder.searchFiles(searchQuery));
  if (isErr(filesResult)) {
    return err(
      `Erro ao buscar arquivos na pasta "${className}/${year}" para a matrícula "${studentId}".`,
    );
  }

  const files = filesResult.value;

  while (files.hasNext()) {
    const file = files.next();
    if (!file.getName().startsWith(prefix)) continue;

    return ok(file.getId());
  }

  return ok(null);
}
