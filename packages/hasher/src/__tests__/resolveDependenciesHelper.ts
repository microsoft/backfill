import { setupFixture } from "backfill-utils-test";

import { getYarnWorkspaces } from "../yarnWorkspaces";

export async function filterDependenciesInFixture(
  fixture: string,
  filterFunction: any
) {
  const packageRoot = await setupFixture(fixture);
  const workspacesPackageInfo = getYarnWorkspaces(packageRoot);

  const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

  const filteredDependencies = filterFunction(
    dependencies,
    workspacesPackageInfo
  );

  return filteredDependencies;
}
