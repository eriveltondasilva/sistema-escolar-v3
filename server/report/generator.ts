// server/report/generator.ts
import { getErrorMsg } from "#utils/error.ts";
import { formatDate, formatSex } from "#utils/formatters.ts";
import { generateReportLinkToken } from "#utils/link-token.ts";
import { getScriptProp } from "#utils/script-properties.ts";
import { getPlaceholderFields, VALID_CLASSES } from "./constants.ts";
import { getGradesForStudent, getPersonalData } from "./data-access.ts";

import type { AssessmentType } from "../types.ts";
import type { GenerateReportForStudentParams, SubjectGrades } from "./types.ts";

interface ReplacePlaceholderParams {
  body: GoogleAppsScript.Document.Body;
  key: string;
  value: string | null | undefined;
}

function replacePlaceholder({
  body,
  key,
  value,
}: ReplacePlaceholderParams): void {
  const safeValue = String(value ?? "").replace(/\$/g, "$$$$");
  body.replaceText("{{" + key + "}}", safeValue);
}

interface ReplaceStatusPlaceholderParams {
  body: GoogleAppsScript.Document.Body;
  subjectCode: string;
  rawValue: unknown;
  format: (value: unknown) => string;
}

function replaceStatusPlaceholder({
  body,
  subjectCode,
  rawValue,
  format,
}: ReplaceStatusPlaceholderParams): void {
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

interface InsertQRCodeParams {
  body: GoogleAppsScript.Document.Body;
  studentId: string;
  className: string;
  year: string;
}

function insertQRCode({
  body,
  studentId,
  year,
  className,
}: InsertQRCodeParams): void {
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
      `https://script.google.com/macros/s/${encodeURIComponent(webAppId)}/exec` +
      `?studentId=${encodeURIComponent(studentId)}` +
      `&className=${encodeURIComponent(className)}` +
      `&year=${encodeURIComponent(year)}` +
      `&token=${encodeURIComponent(token)}`;

    const qrApiUrl = `https://quickchart.io/qr?text=${validationUrl}&size=80`;

    const imageBlob = UrlFetchApp.fetch(qrApiUrl).getBlob();
    const textElement = element.getElement();
    const parent = textElement.getParent().asParagraph();
    const childIndex = parent.getChildIndex(textElement);

    parent.insertInlineImage(childIndex, imageBlob);
  } catch (error) {
    console.warn(
      `insertQRCode: falha ao gerar QR para matrícula ${studentId} — ${getErrorMsg(error)}`,
    );
  } finally {
    element.getElement().removeFromParent();
  }
}

interface TrashPreviousPdfVersionsParams {
  pdfFolder: GoogleAppsScript.Drive.Folder;
  studentId: string;
  keepFileId: string;
}

function trashPreviousPdfVersions({
  pdfFolder,
  studentId,
  keepFileId,
}: TrashPreviousPdfVersionsParams): void {
  const prefix = `${studentId}_`;
  const searchQuery =
    `title contains "${prefix}" ` +
    "and mimeType = 'application/pdf' " +
    "and trashed = false";
  const existingFiles = pdfFolder.searchFiles(searchQuery);

  while (existingFiles.hasNext()) {
    const file = existingFiles.next();

    if (file.getId() !== keepFileId && file.getName().startsWith(prefix)) {
      file.setTrashed(true);
    }
  }
}

interface FillSubjectPlaceholdersParams {
  body: GoogleAppsScript.Document.Body;
  assessmentType: AssessmentType;
  grades: SubjectGrades;
  subjectCode: string;
}

function fillSubjectPlaceholders({
  body,
  assessmentType,
  subjectCode,
  grades,
}: FillSubjectPlaceholdersParams): void {
  const placeholderFields = getPlaceholderFields(assessmentType);
  const statusField = placeholderFields.find((f) => f.suffix === "sf");

  for (const { suffix, field, format } of placeholderFields) {
    if (suffix === "sf") continue;

    replacePlaceholder({
      body,
      key: `${subjectCode}_${suffix}`.toLowerCase(),
      value: format(grades[field]),
    });
  }

  if (statusField) {
    replaceStatusPlaceholder({
      body,
      subjectCode,
      rawValue: grades[statusField.field],
      format: statusField.format,
    });
  }
}

// -------------------------------------

/**
 *  @returns O URL do arquivo PDF gerado
 */
export function generateReportForStudent({
  studentId,
  className,
  foundSubjects,
  context,
}: GenerateReportForStudentParams): string {
  const personalData = getPersonalData(context, studentId);
  const gradesData = getGradesForStudent({ studentId, foundSubjects, context });
  const classInfo = VALID_CLASSES.find(
    (validClass) => validClass.name === className,
  );

  const fileName = `${studentId}_${personalData.name.replace(/\s+/g, "_").toLowerCase()}`;
  const docCopy = context.templateFile.makeCopy(fileName, context.tempFolder);

  const date = new Date();

  try {
    const doc = DocumentApp.openById(docCopy.getId());
    const body = doc.getBody();

    // dados pessoais do aluno
    replacePlaceholder({ body, key: "nome", value: personalData.name });
    replacePlaceholder({ body, key: "matricula", value: studentId });
    replacePlaceholder({
      body,
      key: "filiacao",
      value: personalData.guardianNames,
    });
    replacePlaceholder({ body, key: "endereco", value: personalData.address });
    replacePlaceholder({
      body,
      key: "data_nascimento",
      value: personalData.birthDate,
    });
    replacePlaceholder({
      body,
      key: "nacionalidade",
      value: personalData.nationality,
    });
    replacePlaceholder({
      body,
      key: "sexo",
      value: formatSex(personalData.sex),
    });

    // dados da turma e ano letivo
    replacePlaceholder({ body, key: "etapa", value: classInfo?.stage });
    replacePlaceholder({ body, key: "serie", value: classInfo?.name });
    replacePlaceholder({ body, key: "turma", value: "Única" });
    replacePlaceholder({ body, key: "turno", value: classInfo?.shift });
    replacePlaceholder({ body, key: "ano_letivo", value: context.year });

    // data e hora de emissão
    replacePlaceholder({
      body,
      key: "data_emissao",
      value: formatDate(date, { dateStyle: "long" }),
    });
    replacePlaceholder({
      body,
      key: "hora_emissao",
      value: date.toLocaleTimeString(),
    });

    // notas por disciplina
    for (const subject of foundSubjects) {
      const grades = gradesData[subject.name] ?? {};
      fillSubjectPlaceholders({
        body,
        grades,
        subjectCode: subject.code,
        assessmentType: context.assessmentType,
      });
    }

    insertQRCode({ body, studentId, className, year: context.year });

    doc.saveAndClose();

    const pdfBlob = docCopy.getAs("application/pdf");
    const pdfFile = context.pdfFolder
      .createFile(pdfBlob)
      .setName(`${fileName}.pdf`);

    pdfFile.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    );

    trashPreviousPdfVersions({
      pdfFolder: context.pdfFolder,
      keepFileId: pdfFile.getId(),
      studentId,
    });

    return pdfFile.getUrl();
  } finally {
    docCopy.setTrashed(true);
  }
}
