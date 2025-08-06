import path from "path";
import fs from "fs-extra";
import tempy from "tempy";
import execa from "execa";

const fixturesDir = path.resolve(__dirname, "../__fixtures__");

export function setupFixture(fixtureName: string) {
  const fixturePath = path.join(fixturesDir, fixtureName);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Couldn't find fixture "${fixtureName}" in ${fixturesDir}`);
  }

  const tempDir = tempy.directory();
  const cwd = path.join(tempDir, `backfill-${fixtureName}`);

  fs.mkdirpSync(cwd);
  fs.copySync(fixturePath, cwd);

  execa.sync("git", ["init"], { cwd });
  execa.sync("git", ["config", "user.email", "test@testme.com"], { cwd });
  execa.sync("git", ["config", "user.name", "test fixture"], { cwd });
  execa.sync("git", ["add", "."], { cwd });
  execa.sync("git", ["commit", "-m", "test"], { cwd });

  return cwd;
}

/**
 * Remove a temp directory, ignoring any errors.
 */
export function removeTempDir(tempDir: string) {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore errors during cleanup--it's probably from a virus scanner lock
    // or something, and the OS will clean it up eventually
  }
}
