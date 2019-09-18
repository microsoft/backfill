import * as findUp from "find-up";
import * as path from "path";

export async function findPathToBackfill() {
  const commandPath = await findUp(path.join("bin", "backfill.js"), {
    cwd: __dirname
  });
  if (!commandPath) {
    throw new Error("Cannot find path to `backfill` command");
  }

  return commandPath;
}
