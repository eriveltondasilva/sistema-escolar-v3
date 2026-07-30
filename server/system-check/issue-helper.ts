// server/system-check/issue-helper.ts
import { getErrorMsg } from "../utils/error.ts";

import type { Issue } from "../types.ts";

/** Constrói um Issue de erro a partir de uma exceção, logando no console. */
export function toIssue(label: string, error: unknown, url?: string): Issue {
  console.error(label, error);
  const message = getErrorMsg(error);
  const issue: Issue = {
    type: "error",
    text: label ? `${label}: ${message}` : message,
  };

  if (url) issue.url = url;

  return issue;
}
