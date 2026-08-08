// server/system-check/issue-helper.ts
import { getErrorMsg } from "#utils/error.ts";

import type { Issue } from "#types.ts";

interface IssueCreator {
  label: string;
  error: unknown;
  url?: string;
}

/** Constrói um Issue de erro a partir de uma exceção, logando no console. */
export function toIssue({ label, error, url }: IssueCreator): Issue {
  console.error(label, error);
  const issue: Issue = {
    type: "error",
    text: `${label}: ${getErrorMsg(error)}`,
  };

  if (url) issue.url = url;

  return issue;
}
