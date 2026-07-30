// client/dialogs/validation-result.ts
import { parseInitData } from "../utils.ts";

type IssueType = "error" | "warning";

type ValidationIssue = {
  type: IssueType;
  text: string;
  url?: string;
};

type ValidationResultPayload = {
  issues: ValidationIssue[];
};

type FilterOption = "all" | IssueType;

type DiagnosticPanelState = ValidationResultPayload & {
  filter: FilterOption;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly filteredIssues: ValidationIssue[];
};

function diagnosticPanel(el: HTMLElement): DiagnosticPanelState {
  const { issues } = parseInitData<ValidationResultPayload>(el);

  return {
    issues,
    filter: "all",

    get errorCount() {
      return this.issues.filter((issue) => issue.type === "error").length;
    },
    get warningCount() {
      return this.issues.filter((issue) => issue.type === "warning").length;
    },
    get filteredIssues() {
      if (this.filter === "all") return this.issues;
      return this.issues.filter((issue) => issue.type === this.filter);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("diagnosticPanel", diagnosticPanel);
});
