import type { Issue } from "#server/types.ts";

// server/utils/error.ts
export function getErrorMsg(error: unknown): string {
  return Error.isError(error) ? error.message : String(error);
}

export function collectOrIssue<T>(
  issues: Issue[],
  label: string | null,
  fn: () => T,
  url?: string,
): T | null {
  try {
    return fn();
  } catch (e) {
    const message = getErrorMsg(e);
    const issue: Issue = {
      type: "error",
      text: label ? `${label}: ${message}` : message,
    };
    if (url) issue.url = url;
    issues.push(issue);
    return null;
  }
}
