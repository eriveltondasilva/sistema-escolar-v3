// server/report/generator.ts
import { GoogleMimeType } from "#server/config/constants.ts";
import { getErrorMsg } from "#utils/error.ts";
import { formatDate, formatSex, padStudentId } from "#utils/formatters.ts";
import { getPlaceholderFields, VALID_CLASSES } from "./constants.ts";
import { getGradesForStudent, getPersonalData } from "./data-access.ts";

import type { AssessmentType } from "../types.ts";
import type { GenerateReportForStudentParams, SubjectGrades } from "./types.ts";

interface ReplacePlaceholder {
  body: GoogleAppsScript.Document.Body;
  key: string;
  value: string | null | undefined;
}

function replacePlaceholder({ body, key, value }: ReplacePlaceholder): void {
  body.replaceText(
    "{{" + key + "}}",
    String(value ?? "").replace(/\$/g, "$$$$"),
  );
}

interface FillSubjectPlaceholders {
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
}: FillSubjectPlaceholders): void {
  const placeholderFields = getPlaceholderFields(assessmentType);

  for (const { suffix, field, format } of placeholderFields) {
    replacePlaceholder({
      body,
      key: `${subjectCode}_${suffix}`.toLowerCase(),
      value: format(grades[field]),
    });
  }
}

interface InsertQRCode {
  body: GoogleAppsScript.Document.Body;
  pdfUrl: string;
}

function insertQRCode({ body, pdfUrl }: InsertQRCode): void {
  const element = body.findText("{{qr_code}}");
  if (!element) return;

  try {
    const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(pdfUrl)}&size=140`;
    const response = UrlFetchApp.fetch(qrApiUrl, { muteHttpExceptions: true });

    if (response.getResponseCode() !== 200) {
      throw new Error(`QR API retornou ${response.getResponseCode()}`);
    }

    const imageBlob = response.getBlob();
    const textElement = element.getElement();
    const parent = textElement.getParent().asParagraph();
    parent.insertInlineImage(parent.getChildIndex(textElement), imageBlob);
  } catch (error) {
    console.warn(`[insertQRCode] falha — ${getErrorMsg(error)}`);
  } finally {
    element.getElement().removeFromParent();
  }
}

interface TrashPreviousPdfVersions {
  pdfFolder: GoogleAppsScript.Drive.Folder;
  paddedStudentId: string;
  keepFileId: string;
}

function trashPreviousPdfVersions({
  pdfFolder,
  paddedStudentId,
  keepFileId,
}: TrashPreviousPdfVersions): void {
  const prefix = `${paddedStudentId}_`;
  const searchQuery =
    `title contains '${prefix}' ` +
    `and mimeType = '${GoogleMimeType.PDF}' ` +
    "and trashed = false";
  const existingFiles = pdfFolder.searchFiles(searchQuery);

  while (existingFiles.hasNext()) {
    const file = existingFiles.next();

    if (file.getId() !== keepFileId && file.getName().startsWith(prefix)) {
      file.setTrashed(true);
    }
  }
}

function updateDriveFileContent(
  fileId: string,
  blob: GoogleAppsScript.Base.Blob,
): void {
  // @ts-expect-error: false positive
  Drive.Files.update(null, fileId, blob);
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
  const classInfo = VALID_CLASSES.find((c) => c.name === className);

  const paddedId = padStudentId(studentId);
  const safeName = personalData.name.replace(/\s+/g, "_").toLowerCase();
  const fileName = `${paddedId}_${safeName}`;

  const docCopy = context.templateFile.makeCopy(fileName, context.tempFolder);

  const date = new Date();

  try {
    const emptyBlob = Utilities.newBlob(
      [],
      GoogleMimeType.PDF,
      `${fileName}.pdf`,
    );
    const pdfFile = context.tempFolder.createFile(emptyBlob);

    pdfFile.setSharing(
      DriveApp.Access.ANYONE_WITH_LINK,
      DriveApp.Permission.VIEW,
    );

    const pdfUrl = `https://drive.google.com/file/d/${pdfFile.getId()}/view`;

    const doc = DocumentApp.openById(docCopy.getId());
    const body = doc.getBody();

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
    replacePlaceholder({ body, key: "etapa", value: classInfo?.stage });
    replacePlaceholder({ body, key: "serie", value: classInfo?.name });
    replacePlaceholder({ body, key: "turma", value: "Única" });
    replacePlaceholder({ body, key: "turno", value: classInfo?.shift });
    replacePlaceholder({ body, key: "ano_letivo", value: context.year });
    replacePlaceholder({
      body,
      key: "data_emissao",
      value: formatDate(date, "dd/MM/yyyy"),
    });
    replacePlaceholder({
      body,
      key: "hora_emissao",
      value: date.toLocaleTimeString(),
    });

    for (const subject of foundSubjects) {
      const grades = gradesData[subject.name] ?? {};
      fillSubjectPlaceholders({
        body,
        grades,
        subjectCode: subject.code,
        assessmentType: context.assessmentType,
      });
    }

    insertQRCode({ body, pdfUrl });

    doc.saveAndClose();

    const pdfBlob = docCopy.getAs(GoogleMimeType.PDF);
    updateDriveFileContent(pdfFile.getId(), pdfBlob);

    context.pdfFolder.addFile(pdfFile);
    context.tempFolder.removeFile(pdfFile);

    trashPreviousPdfVersions({
      pdfFolder: context.pdfFolder,
      keepFileId: pdfFile.getId(),
      paddedStudentId: paddedId,
    });

    return pdfFile.getUrl();
  } finally {
    docCopy.setTrashed(true);
  }
}
