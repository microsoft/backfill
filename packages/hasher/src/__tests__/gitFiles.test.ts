import path from "path";
import { EOL } from "os";
import fs from "fs-extra";
import tempy from "tempy";

import { getListOfGitFiles } from "../gitFiles";

describe("getFilesTrackedByGit()", () => {
  it("when packageRoot is also repo root", async () => {
    const cwd = tempy.directory();

    // Creating very simple git repo
    await fs.mkdirp(path.join(cwd, ".git"));
    await fs.writeFile(path.join(cwd, ".gitignore"), "lib");
    await fs.writeFile(path.join(cwd, "package.json"), "");
    await fs.mkdirp(path.join(cwd, "lib"));
    await fs.mkdirp(path.join(cwd, "src"));
    await fs.writeFile(path.join(cwd, "src", "index.ts"), "");
    await fs.writeFile(path.join(cwd, "lib", "index.js"), "");

    const files = await getListOfGitFiles(cwd);

    const expectedFiles = ["package.json", path.join("src", "index.ts")];

    expect(files).toStrictEqual(expectedFiles);
  });
  it("when packageRoot is not repo root", async () => {
    const repoRoot = tempy.directory();
    const packageRoot = path.join(repoRoot, "packages", "foo");

    // Creating git repo
    await fs.mkdirp(path.join(repoRoot, ".git"));
    await fs.writeFile(path.join(repoRoot, ".gitignore"), "lib");
    await fs.writeFile(path.join(repoRoot, "package.json"), "");

    await fs.mkdirp(packageRoot);
    await fs.writeFile(
      path.join(packageRoot, ".gitignore"),
      `!lib${EOL}lib/*${EOL}!lib/index.d.ts`
    );
    await fs.writeFile(path.join(packageRoot, "package.json"), "");

    await fs.mkdirp(path.join(packageRoot, "lib"));
    await fs.mkdirp(path.join(packageRoot, "src"));
    await fs.writeFile(path.join(packageRoot, "src", "index.ts"), "");
    await fs.writeFile(path.join(packageRoot, "lib", "index.js"), "");
    await fs.writeFile(path.join(packageRoot, "lib", "index.d.ts"), "");

    const files = await getListOfGitFiles(packageRoot);

    const expectedFiles = [
      path.join("lib", "index.d.ts"),
      "package.json",
      path.join("src", "index.ts")
    ];

    expect(files).toStrictEqual(expectedFiles);
  });
});
