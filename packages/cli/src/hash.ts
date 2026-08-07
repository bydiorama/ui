/** Content hashing for the lockfile — sha256:<hex>, always. */

import { createHash } from "node:crypto";

export function hashContent(content: string): string {
  return `sha256:${createHash("sha256").update(content, "utf8").digest("hex")}`;
}
