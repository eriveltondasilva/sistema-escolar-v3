// server/system-check/types.ts
import type { Issue } from "../types.ts";

/** Payload de validation-result.html. */
export interface ValidationResultInitData {
  issues: Issue[];
}
