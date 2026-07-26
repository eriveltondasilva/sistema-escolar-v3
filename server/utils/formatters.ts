// server/utils/formatters.ts
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "../config.ts";

/** Formata os nomes dos responsáveis concatenando-os corretamente. */
export function formatGuardianNames(names: string[]): string {
  if (names.length === 0) return "--";
  if (names.length === 1) return names[0]!;

  return new Intl.ListFormat(DEFAULT_LOCALE, {
    style: "long",
    type: "conjunction",
  }).format(names);
}

/** Formata os números que representam as notas com até 2 casas decimais. */
export function formatGrade(value: unknown): string {
  const trimmedValue = String(value ?? "").trim();
  if (trimmedValue === "") return "--";

  const number = Number(trimmedValue);
  if (Number.isNaN(number)) return trimmedValue;

  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatStatus(status: unknown): string {
  const trimmedValue = String(status ?? "").trim();
  if (trimmedValue === "") return "--";

  return trimmedValue.slice(0, 3).toUpperCase();
}

/** Formata um valor simples, inserindo "--" caso esteja vazio. */
export function formatValue(value: unknown): string {
  if (value === "" || value == null) {
    return "--";
  }

  return String(value);
}

export function formatSex(sex: string): string {
  const gender: Record<string, string> = {
    F: "Feminino",
    M: "Masculino",
  };

  return gender[sex] ?? "--";
}

/** Retorna a data no formato extenso e de acordo com as opções nativas do objeto Date. */
export function formatDate(
  date: unknown,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!date || !(date instanceof Date)) return "Data inválida";

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: "short",
    timeZone: DEFAULT_TIMEZONE,
    ...options,
  }).format(date);
}
