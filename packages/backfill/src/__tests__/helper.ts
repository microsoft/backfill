import path from "path";
import findUp from "find-up";

export async function findPathToBackfill(): Promise<string> {
  const commandPath = await findUp(path.join("bin", "backfill.js"), {
    cwd: __dirname,
  });
  if (!commandPath) {
    throw new Error("Cannot find path to `backfill` command");
  }

  return commandPath;
}
