// server/utils/formatters.ts
import { DEFAULT_LOCALE } from "#config/constants.ts";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

const listFormatter = new Intl.ListFormat(DEFAULT_LOCALE, {
  style: "long",
  type: "conjunction",
});
const gradeFormatter = new Intl.NumberFormat(DEFAULT_LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const SEX_MAP: Record<string, string> = {
  F: "Feminino",
  M: "Masculino",
};

export type SortOrder = "asc" | "desc";

/**
 * Compares two strings taking embedded numeric values into account.
 */
export function compareStrings(
  a: string,
  b: string,
  order: SortOrder = "asc",
): number {
  const comparison = a.localeCompare(b, DEFAULT_LOCALE, {
    numeric: true,
    sensitivity: "base",
  });

  return order === "desc" ? -comparison : comparison;
}

// -------------------------------------

/** Normalizes any input into a trimmed string safely. */
export function formatStr(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

/** Formats a simple value, returning "--" if empty. */
export function formatValue(value: unknown): string {
  const trimmedValue = formatStr(value);
  return trimmedValue === "" ? "--" : trimmedValue;
}

export function padStudentId(studentId: string): string {
  return studentId.replace(/\D/g, "").padStart(4, "0");
}

/** Formats guardian names concatenating them properly. */
export function formatGuardianNames(names: string[]): string {
  if (!names || names.length === 0) return "--";
  if (names.length === 1) return names[0]!;

  return listFormatter.format(names);
}

/** Formats numbers representing grades with up to 2 decimal places. */
export function formatGrade(value: unknown): string {
  const trimmedValue = formatStr(value);
  if (trimmedValue === "") return "--";

  const normalizedValue = trimmedValue.replace(",", ".");
  const number = Number(normalizedValue);

  if (Number.isNaN(number)) return trimmedValue;

  return gradeFormatter.format(number);
}

/** Formats a status value, returning "--" if empty. */
export function formatStatus(status: unknown): string {
  const trimmedValue = formatStr(status);
  return trimmedValue === "" ? "--" : trimmedValue.slice(0, 3).toUpperCase();
}

/** Formats a sex value, returning "--" if empty. */
export function formatSex(sex: unknown): string {
  const normalizedSex = formatStr(sex).toUpperCase();
  return SEX_MAP[normalizedSex] ?? "--";
}

/** Formats a valid Date object to the desired pattern using GAS Utilities. */
export function formatDate(date: unknown, format: string): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return Utilities.formatDate(date, DEFAULT_TIMEZONE, format);
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: DEFAULT_TIMEZONE,
  dateStyle: "long",
});

/**
 * Formats a valid Date object to a localized long string.
 * Example output: "12 de abril de 1995"
 */
export function formatLongDate(date: unknown): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return dateFormatter.format(date);
}

/** Parses various date formats into a valid Date object using GAS Utilities. */
export function parseDate(input: unknown): Date {
  if (input instanceof Date) {
    return input;
  }

  const cleanInput = formatStr(input);

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanInput)) {
    return Utilities.parseDate(cleanInput, DEFAULT_TIMEZONE, "yyyy-MM-dd");
  }

  return new Date(NaN);
}
