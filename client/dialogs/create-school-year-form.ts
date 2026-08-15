// client/dialogs/create-school-year-form.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { CreateSchoolYearFormInitData } from "#server/school-year/types.ts";
import type { MatriculationInput } from "../types.ts";

interface InitDialog extends CreateSchoolYearFormInitData {
  year: string;
  matriculationsByClass: Record<string, string>;
  expanded: Record<string, boolean>;
  isLoading: boolean;
  error: string;
  // Funções
  matriculationCount(className: string): number;
  submit(): Promise<void>;
}

function parseStudentIds(text: string): string[] {
  return text
    .split("\n")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

function isValidYear(value: string): boolean {
  return /^\d{4}$/.test(value.trim());
}

function initDialog(el: HTMLElement): InitDialog {
  const { classNames } = parseInitData<CreateSchoolYearFormInitData>(el);

  return {
    classNames,
    year: "",
    matriculationsByClass: Object.fromEntries(
      classNames.map((name) => [name, ""]),
    ),
    expanded: Object.fromEntries(classNames.map((name) => [name, false])),
    isLoading: false,
    error: "",

    matriculationCount(className: string): number {
      return parseStudentIds(this.matriculationsByClass[className] ?? "")
        .length;
    },

    async submit() {
      this.error = "";

      if (!isValidYear(this.year)) {
        this.error = "Digite um ano com 4 dígitos, ex: 2026.";
        return;
      }

      const matriculations: MatriculationInput[] = Object.entries(
        this.matriculationsByClass,
      ).map(([className, text]) => ({
        className,
        studentIds: parseStudentIds(text),
      }));

      this.isLoading = true;

      try {
        await runServerAction((server) =>
          server.submitSchoolYearCreation(this.year.trim(), matriculations),
        );

        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isLoading = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
