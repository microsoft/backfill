import path from "path";
import findUp from "find-up";
import fs from "fs-extra";
import tempy from "tempy";
import execa from "execa";

async function findFixturePath(cwd: string, fixtureName: string) {
  return await findUp(path.join("__fixtures__", fixtureName), {
    cwd,
    type: "directory"
  });
}

let tmpIndex = 0;

export async function setupFixture(fixtureName: string) {
  const fixturePath = await findFixturePath(__dirname, fixtureName);

  if (!fixturePath) {
    throw new Error(
      `Couldn't find fixture "${fixtureName}" in "${path.join(
        __dirname,
        "__fixtures__"
      )}"`
    );
  }

  const tempDir = tempy.directory();
  const tmpIndexSegment = `${tmpIndex++}`;
  const cwd = path.join(tempDir, tmpIndexSegment, fixtureName);

  fs.mkdirpSync(cwd);
  fs.copySync(fixturePath, cwd);

  execa.sync("git", ["init"], { cwd });
  execa.sync("git", ["add", "."], { cwd });
  execa.sync("git", ["commit", "-m", "test"], { cwd });

  return cwd;
}
