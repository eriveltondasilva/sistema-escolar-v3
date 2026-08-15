// client/dialogs/validation-result.ts
import { parseInitData } from "../utils/parse-init-data.ts";

import type { ValidationResultInitData } from "#server/system-check/types.ts";
import type { Issue, IssueType } from "#server/types.ts";

type FilterOption = "all" | IssueType;

interface InitDialog extends ValidationResultInitData {
  filter: FilterOption;
  readonly errorCount: number;
  readonly warningCount: number;
  readonly filteredIssues: Issue[];
}

function InitDialog(el: HTMLElement): InitDialog {
  const initData = parseInitData<ValidationResultInitData>(el);

  const counts = initData.issues.reduce(
    (acc, issue) => {
      if (issue.type === "error") acc.errors++;
      if (issue.type === "warning") acc.warnings++;
      return acc;
    },
    { errors: 0, warnings: 0 },
  );

  return {
    ...initData,
    filter: "all",
    errorCount: counts.errors,
    warningCount: counts.warnings,

    get filteredIssues() {
      if (this.filter === "all") return this.issues;
      return this.issues.filter((issue) => issue.type === this.filter);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", InitDialog);
});
