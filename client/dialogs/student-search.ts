// client/dialogs/student-search.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { StudentStatus } from "#server/types.ts";
import type { StudentOption, StudentSearchDetails } from "../types.ts";

interface InitDialog {
  query: string;
  status: StudentStatus;
  isSearching: boolean;
  isLoadingDetails: boolean;
  isOpeningEdit: boolean;
  results: StudentOption[];
  selectedStudent: StudentSearchDetails | null;
  error: string;
  // Funções
  search(): Promise<void>;
  selectStudent(studentId: string): Promise<void>;
  editStudent(): Promise<void>;
  clearSelection(): void;
}

function initDialog(): InitDialog {
  return {
    query: "",
    status: "ativo",
    isSearching: false,
    isLoadingDetails: false,
    isOpeningEdit: false,
    results: [],
    selectedStudent: null,
    error: "",

    async search() {
      this.error = "";
      this.selectedStudent = null;

      if (!this.query.trim()) {
        this.results = [];
        return;
      }

      this.isSearching = true;

      try {
        this.results = await runServerAction<StudentOption[]>((server) =>
          server.getStudentSearchResults(this.query, this.status),
        );
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
      } finally {
        this.isSearching = false;
      }
    },

    async selectStudent(studentId: string) {
      this.error = "";
      this.isLoadingDetails = true;

      try {
        this.selectedStudent = await runServerAction<StudentSearchDetails>(
          (server) => server.getStudentDetailsForSearch(studentId),
        );
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
      } finally {
        this.isLoadingDetails = false;
      }
    },

    async editStudent() {
      if (!this.selectedStudent) return;

      this.isOpeningEdit = true;
      this.error = "";

      const studentId = this.selectedStudent.student.studentId;

      try {
        await runServerAction((server) =>
          server.openStudentEditDialog(studentId),
        );
        // Fecha a modal no sucesso. Não precisamos do finally para resetar o loading
        // porque a janela inteira será destruída.
        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isOpeningEdit = false;
      }
    },

    clearSelection() {
      this.selectedStudent = null;
      this.error = "";
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
