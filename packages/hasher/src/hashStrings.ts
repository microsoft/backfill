import crypto from "crypto";

export function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");

  // Sort to ensure consistent ordering/hashing (use basic sorting since locale correctness doesn't matter)
  const elements =
    typeof strings === "string" ? [strings] : [...strings].sort();
  for (const element of elements) {
    hasher.update(element);
  }

  return hasher.digest("hex");
}
