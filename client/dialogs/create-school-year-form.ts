// client/dialogs/create-school-year-form.ts
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { MatriculationInput } from "../types.ts";

type CreateSchoolYearFormPayload = {
  classNames: string[];
};

interface CreateSchoolYearFormState {
  classNames: string[];
  year: string;
  matriculationsByClass: Record<string, string>;
  isLoading: boolean;
  error: string;
  submit(): void;
}

function initDialog(el: HTMLElement): CreateSchoolYearFormState {
  const { classNames } = parseInitData<CreateSchoolYearFormPayload>(el);

  return {
    classNames,
    year: "",
    matriculationsByClass: Object.fromEntries(
      classNames.map((name) => [name, ""]),
    ) as Record<string, string>,
    isLoading: false,
    error: "",

    submit() {
      this.error = "";

      const isValid = /^\d{4}$/.test(this.year.trim());
      if (!isValid) {
        this.error = "Digite um ano com 4 dígitos, ex: 2026.";
        return;
      }

      const matriculations: MatriculationInput[] = Object.entries(
        this.matriculationsByClass,
      ).map(([className, text]) => ({
        className,
        studentIds: text
          .split("\n")
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      }));

      this.isLoading = true;

      // valida tudo antes de escrever (tudo ou nada); em caso de sucesso,
      // o próprio servidor já abre a dialog de resultado
      // (CreateSchoolYearResultDialog.html, já existente)
      runServerAction((server) =>
        server.submitSchoolYearCreation(this.year.trim(), matriculations),
      )
        .then(() => google.script.host.close())
        .catch((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
