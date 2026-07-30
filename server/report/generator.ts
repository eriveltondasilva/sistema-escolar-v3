// server/report/generator.ts
import { getPlaceholderFields, VALID_CLASSES } from "./constants.ts";
import { getGradesForStudent, getPersonalData } from "./data-access.ts";
import { getErrorMsg } from "../utils/error.ts";
import { formatDate, formatSex } from "../utils/formatters.ts";
import { generateReportLinkToken } from "../utils/link-token.ts";
import { getScriptProp } from "../utils/script-properties.ts";

import type { AssessmentType } from "../types.ts";
import type { GenerateReportForStudentParams, SubjectGrades } from "./types.ts";

export function replacePlaceholder(
  body: GoogleAppsScript.Document.Body,
  key: string,
  value: string | null | undefined,
): void {
  const safeValue = String(value ?? "").replace(/\$/g, "$$$$");
  body.replaceText("{{" + key + "}}", safeValue);
}

export function insertQRCode(
  body: GoogleAppsScript.Document.Body,
  studentId: string,
  year: string,
  className: string,
): void {
  const element = body.findText("{{qr_code}}");
  if (!element) return;

  try {
    const webAppId = getScriptProp("WEB_APP_ID");
    const token = generateReportLinkToken({
      studentId,
      className,
      year,
    });

    const validationUrl =
      `https://script.google.com/macros/s/${webAppId}/exec` +
      `?studentId=${encodeURIComponent(studentId)}` +
      `&className=${encodeURIComponent(className)}` +
      `&year=${encodeURIComponent(year)}` +
      `&token=${encodeURIComponent(token)}`;
    const qrApiUrl =
      "https://quickchart.io/qr" +
      `?text=${encodeURIComponent(validationUrl)}` +
      "&size=80";

    const imageBlob = UrlFetchApp.fetch(qrApiUrl).getBlob();
    const textElement = element.getElement();
    const parent = textElement.getParent().asParagraph();
    const childIndex = parent.getChildIndex(textElement);

    parent.insertInlineImage(childIndex, imageBlob);
  } catch (error) {
    const errorMessage = getErrorMsg(error);
    console.warn(
      `insertQRCode: falha ao gerar QR para matrícula ${studentId} — ${errorMessage}`,
    );
  } finally {
    element.getElement().removeFromParent();
  }
}

/** @returns O URL do arquivo PDF gerado */
export function generateReportForStudent({
  studentId,
  className,
  foundSubjects,
  context,
}: GenerateReportForStudentParams): string {
  const personalData = getPersonalData(studentId, context);
  const gradesData = getGradesForStudent(studentId, foundSubjects, context);

  const fileName = `${studentId}_${personalData.name.replace(/\s+/g, "_").toLowerCase()}`;
  const docCopy = context.templateFile.makeCopy(fileName, context.tempFolder);
  const classInfo = VALID_CLASSES.find(
    (validClass) => validClass.className === className,
  );
  const date = new Date();

  try {
    const doc = DocumentApp.openById(docCopy.getId());
    const body = doc.getBody();

    replacePlaceholder(body, "nome", personalData.name);
    replacePlaceholder(body, "matricula", studentId);
    replacePlaceholder(body, "filiacao", personalData.guardianNames);
    replacePlaceholder(body, "endereco", personalData.address);

    replacePlaceholder(body, "data_nascimento", personalData.birthDate);
    replacePlaceholder(body, "nacionalidade", personalData.nationality);
    replacePlaceholder(body, "sexo", formatSex(personalData.sex));

    replacePlaceholder(body, "etapa", classInfo?.stage ?? "");
    replacePlaceholder(body, "serie", classInfo?.className ?? "");
    replacePlaceholder(body, "turma", "Única");
    replacePlaceholder(body, "turno", classInfo?.shift ?? "");
    replacePlaceholder(body, "ano_letivo", context.year);

    replacePlaceholder(
      body,
      "data_emissao",
      formatDate(date, { dateStyle: "long" }),
    );
    replacePlaceholder(body, "hora_emissao", date.toLocaleTimeString());

    for (const subject of foundSubjects) {
      const grades = gradesData[subject.name] ?? {};
      fillSubjectPlaceholders(
        body,
        subject.code,
        grades,
        context.assessmentType,
      );
    }

    insertQRCode(body, studentId, context.year, className);

    doc.saveAndClose();

    const pdfBlob = docCopy.getAs("application/pdf");
    const pdfFile = context.pdfFolder
      .createFile(pdfBlob)
      .setName(`${fileName}.pdf`);
    pdfFile.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    );

    trashPreviousPdfVersions(context.pdfFolder, studentId, pdfFile.getId());

    return pdfFile.getUrl();
  } finally {
    docCopy.setTrashed(true);
  }
}

export function trashPreviousPdfVersions(
  pdfFolder: GoogleAppsScript.Drive.Folder,
  studentId: string,
  keepFileId: string,
): void {
  const prefix = `${studentId}_`;
  const searchQuery =
    `title contains '${prefix}' and ` +
    "mimeType = 'application/pdf' and trashed = false";
  const existingFiles = pdfFolder.searchFiles(searchQuery);

  while (existingFiles.hasNext()) {
    const file = existingFiles.next();

    if (file.getId() !== keepFileId && file.getName().startsWith(prefix)) {
      file.setTrashed(true);
    }
  }
}

export function fillSubjectPlaceholders(
  body: GoogleAppsScript.Document.Body,
  subjectCode: string,
  grades: SubjectGrades,
  assessmentType: AssessmentType,
): void {
  const placeholderFields = getPlaceholderFields(assessmentType);
  const statusField = placeholderFields.find((f) => f.suffix === "sf");

  for (const { suffix, field, format } of placeholderFields) {
    if (suffix === "sf") continue;

    replacePlaceholder(
      body,
      `${subjectCode}_${suffix}`.toLowerCase(),
      format(grades[field]),
    );
  }

  if (statusField) {
    replaceStatusPlaceholder(
      body,
      subjectCode,
      grades[statusField.field],
      statusField.format,
    );
  }
}

function replaceStatusPlaceholder(
  body: GoogleAppsScript.Document.Body,
  subjectCode: string,
  rawValue: unknown,
  format: (value: unknown) => string,
): void {
  const placeholder = `{{${subjectCode.toLowerCase()}_sf}}`;
  const found = body.findText(placeholder);
  if (!found) return;

  const formattedValue = format(rawValue);
  const textElement = found.getElement().asText();
  const startOffset = found.getStartOffset();
  const endOffsetInclusive = found.getEndOffsetInclusive();

  textElement.deleteText(startOffset, endOffsetInclusive);
  textElement.insertText(startOffset, formattedValue);

  const status = String(rawValue ?? "")
    .trim()
    .toLowerCase();

  if (!["aprovado", "reprovado"].includes(status)) return;

  const color = status === "aprovado" ? "#16a34a" : "#dc2626";
  textElement.setForegroundColor(
    startOffset,
    startOffset + formattedValue.length - 1,
    color,
  );
}
