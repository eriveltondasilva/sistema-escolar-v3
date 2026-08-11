// client/dialogs/validation-result.ts
import { parseInitData } from "../utils/parse-init-data.ts";

import type { ValidationResultInitData } from "#server/system-check/types.ts";
import type { Issue, IssueType } from "#server/types.ts";

type FilterOption = "all" | IssueType;

type DiagnosticPanelState = ValidationResultInitData & {
  filter: FilterOption;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly filteredIssues: Issue[];
};

function initDialog(el: HTMLElement): DiagnosticPanelState {
  const initData = parseInitData<ValidationResultInitData>(el);

  return {
    ...initData,
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
  Alpine.data(initDialog.name, initDialog);
});
