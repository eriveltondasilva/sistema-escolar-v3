// client/dialogs/student-search.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { StudentSearchResult } from "#server/roster/data-access.ts";
import type { StudentStatus } from "#server/types.ts";
import type { StudentOption, StudentSearchDetails } from "../types.ts";
import type { AlpineComponent } from "alpinejs";

interface InitDialog {
  query: string;
  status: StudentStatus;
  isSearching: boolean;
  isLoadingDetails: boolean;
  isOpeningEdit: boolean;
  results: StudentOption[];
  selectedStudentId: string | null;
  selectedStudent: StudentSearchDetails | null;
  truncated: boolean;
  error: string;
  // Funções
  search(): Promise<void>;
  selectStudent(studentId: string): Promise<void>;
  editStudent(): Promise<void>;
}

function initDialog(): AlpineComponent<InitDialog> {
  return {
    query: "",
    status: "ativo",
    isSearching: false,
    isLoadingDetails: false,
    isOpeningEdit: false,
    results: [],
    selectedStudentId: null,
    selectedStudent: null,
    truncated: false,
    error: "",

    async search() {
      this.error = "";
      this.selectedStudentId = null;
      this.selectedStudent = null;

      if (!this.query.trim()) return;

      this.isSearching = true;
      this.results = [];
      this.truncated = false;

      try {
        const result = await runServerAction<StudentSearchResult>((server) =>
          server.getStudentSearchResults(this.query, this.status),
        );

        this.results = result.students;
        this.truncated = result.truncated;
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
      } finally {
        this.isSearching = false;
      }
    },

    async selectStudent(studentId: string) {
      if (this.selectedStudentId === studentId) return;

      this.error = "";
      this.selectedStudentId = studentId;
      this.selectedStudent = null;
      this.isLoadingDetails = true;

      try {
        this.selectedStudent = await runServerAction<StudentSearchDetails>(
          (server) => server.getStudentDetailsForSearch(studentId),
        );
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.selectedStudentId = null;
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
        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isOpeningEdit = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
