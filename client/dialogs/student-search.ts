// client/dialogs/student-search.ts

type StudentSearchResult = {
  studentId: string;
  name: string;
};

type PdfHistoryEntry = {
  pdfUrl: string;
  yearLabel: string;
  className: string;
};

type StudentSearchDetails = {
  student: {
    studentId: string;
    name: string;
    address: string;
    birthDate: string;
  };
  guardianNamesFormatted: string;
  pdfHistory: PdfHistoryEntry[];
};

type StudentSearchState = {
  query: string;
  isSearching: boolean;
  isOpeningEdit: boolean;
  results: StudentSearchResult[];
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

      // getStudentSearchResults(query): StudentSearchResult[]
      google.script.run
        .withSuccessHandler((results: StudentSearchResult[]) => {
          this.results = results;
          this.isSearching = false;
        })
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isSearching = false;
        })
        .getStudentSearchResults(this.query);
    },

    selectStudent(studentId: string) {
      this.error = "";

      // getStudentDetailsForSearch(studentId): StudentSearchDetails
      google.script.run
        .withSuccessHandler((details: StudentSearchDetails) => {
          this.selectedStudent = details;
        })
        .withFailureHandler((err: Error) => {
          this.error = err.message;
        })
        .getStudentDetailsForSearch(studentId);
    },

    clearSelection() {
      this.selectedStudent = null;
      this.error = "";
    },

    editStudent() {
      if (!this.selectedStudent) return;

      this.isOpeningEdit = true;
      this.error = "";

      // openStudentEditDialog(studentId): void — abre uma nova modal
      // e, no sucesso, fechamos esta
      google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isOpeningEdit = false;
        })
        .openStudentEditDialog(this.selectedStudent.student.studentId);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("studentSearchDialog", studentSearchDialog);
});
