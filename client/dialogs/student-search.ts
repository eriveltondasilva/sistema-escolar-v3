// client/dialogs/student-search.ts
import { runServerAction } from "../utils.ts";

import type { StudentOption, StudentSearchDetails } from "../types.ts";

type StudentSearchState = {
  query: string;
  isSearching: boolean;
  isOpeningEdit: boolean;
  results: StudentOption[];
  selectedStudent: StudentSearchDetails | null;
  error: string;
  search(): void;
  selectStudent(studentId: string): void;
  clearSelection(): void;
  editStudent(): void;
};

function studentSearchDialog(): StudentSearchState {
  return {
    query: "",
    isSearching: false,
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
        server.getStudentSearchResults(this.query),
      )
        .then((results) => {
          this.results = results;
        })
        .catch((err: Error) => {
          this.error = err.message;
        })
        .finally(() => {
          this.isSearching = false;
        });
    },

    selectStudent(studentId: string) {
      this.error = "";

      runServerAction<StudentSearchDetails>((server) =>
        server.getStudentDetailsForSearch(studentId),
      )
        .then((details) => {
          this.selectedStudent = details;
        })
        .catch((err: Error) => {
          this.error = err.message;
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
        .catch((err: Error) => {
          this.error = err.message;
          this.isOpeningEdit = false;
        });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("studentSearchDialog", studentSearchDialog);
});
