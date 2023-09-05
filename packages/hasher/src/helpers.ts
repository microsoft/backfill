import crypto from "crypto";
import { findPackageRoot } from "workspace-tools";

export function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");

  const anArray = typeof strings === "string" ? [strings] : strings;
  const elements = [...anArray];
  elements.sort((a, b) => a.localeCompare(b));
  elements.forEach((element) => hasher.update(element));

  return hasher.digest("hex");
}

export async function getPackageRoot(cwd: string): Promise<string> {
  const packageRoot = findPackageRoot(cwd);

  if (!packageRoot) {
    throw new Error(`Could not find package.json inside ${cwd}.`);
  }

  return packageRoot;
}

export function nameAtVersion(name: string, version: string): string {
  return `${name}@${version}`;
}
