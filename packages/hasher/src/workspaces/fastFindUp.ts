import path from "path";
import fs from "fs-extra";

interface FoundRecord {
  cwd: string;
  target: string;
}

let findUpCache = new Map<string, FoundRecord | undefined>();
let root: string;

function checkFoundRecords(targets: string[], cwd: string) {
  for (const found of findUpCache.values()) {
    if (found) {
      for (const target of targets) {
        if (cwd.startsWith(found.cwd) && found.target === target) {
          return path.join(found.cwd, found.target);
        }
      }
    }
  }
}

export async function fastFindUp(targets: string[] | string, cwd: string) {
  if (!root) {
    root = path.parse(cwd).root;
  }

  targets = Array.isArray(targets) ? targets : [targets];

  // check to see if this cwd is inside one of the found records
  const fastFound = checkFoundRecords(targets, cwd);
  if (fastFound) {
    return fastFound;
  }

  const traversed: string[] = [];
  let found: FoundRecord | undefined;
  let needle: string;

  done: {
    while (cwd !== root) {
      for (const target of targets) {
        needle = path.join(cwd, target);

        if (findUpCache.has(needle)) {
          found = findUpCache.get(needle);
          break done;
        } else if (fs.existsSync(needle)) {
          traversed.push(needle);
          found = { cwd, target };
          break done;
        } else {
          traversed.push(needle);
        }
      }

      cwd = path.dirname(cwd);
    }
  }

  for (const key of traversed) {
    findUpCache.set(key, found);
  }

  if (found) {
    return path.join(found.cwd, found.target);
  } else {
    return null;
  }
}
