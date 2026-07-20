// client/dialogs/create-school-year-form.ts

type CreateSchoolYearFormPayload = {
  classNames: string[];
};

type MatriculationInput = {
  className: string;
  studentIds: string[];
};

interface CreateSchoolYearFormState {
  classNames: string[];
  year: string;
  matriculationsByClass: Record<string, string>;
  isLoading: boolean;
  error: string;
  submit(): void;
}

function createSchoolYearForm(el: HTMLElement): CreateSchoolYearFormState {
  const { classNames }: CreateSchoolYearFormPayload = JSON.parse(
    el.dataset.init!,
  );

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

      // submitSchoolYearCreation(yearInput, matriculationsByClass): void
      // — valida tudo antes de escrever (tudo ou nada); em caso de
      // sucesso, o próprio servidor já abre a dialog de resultado
      // (CreateSchoolYearResultDialog.html, já existente) — ver
      // server/lib/registration-actions.ts
      google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        })
        .submitSchoolYearCreation(this.year.trim(), matriculations);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("createSchoolYearForm", createSchoolYearForm);
});
