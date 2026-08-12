// client/dialogs/student-search.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { StudentStatus } from "#server/types.ts";
import type { StudentOption, StudentSearchDetails } from "../types.ts";

type StudentSearchState = {
  query: string;
  status: StudentStatus;
  isSearching: boolean;
  isLoadingDetails: boolean;
  isOpeningEdit: boolean;
  results: StudentOption[];
  selectedStudent: StudentSearchDetails | null;
  error: string;
  // Funções
  search(): void;
  selectStudent(studentId: string): void;
  clearSelection(): void;
  editStudent(): void;
};

function initDialog(): StudentSearchState {
  return {
    query: "",
    status: "ativo",
    isSearching: false,
    isLoadingDetails: false,
    isOpeningEdit: false,
    results: [],
    selectedStudent: null,
    error: "",

    search() {
      this.error = "";
      this.selectedStudent = null;

      if (!this.query.trim()) {
        this.results = [];
        return;
      }

      this.isSearching = true;

      runServerAction<StudentOption[]>((server) =>
        server.getStudentSearchResults(this.query, this.status),
      )
        .then((results) => {
          this.results = results;
        })
        .catch((error: unknown) => {
          this.error = getErrorMsg(error);
        })
        .finally(() => {
          this.isSearching = false;
        });
    },

    selectStudent(studentId: string) {
      this.error = "";
      this.isLoadingDetails = true;

      runServerAction<StudentSearchDetails>((server) =>
        server.getStudentDetailsForSearch(studentId),
      )
        .then((details) => {
          this.selectedStudent = details;
        })
        .catch((error: unknown) => {
          this.error = getErrorMsg(error);
        })
        .finally(() => {
          this.isLoadingDetails = false;
        });
    },

    clearSelection() {
      this.selectedStudent = null;
      this.error = "";
    },

    editStudent() {
      const selectedStudent = this.selectedStudent;
      if (!selectedStudent) return;

      this.isOpeningEdit = true;
      this.error = "";

      // abre uma nova modal e, no sucesso, fechamos esta
      runServerAction((server) =>
        server.openStudentEditDialog(selectedStudent.student.studentId),
      )
        .then(() => google.script.host.close())
        .catch((error: unknown) => {
          this.error = getErrorMsg(error);
          this.isOpeningEdit = false;
        });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
