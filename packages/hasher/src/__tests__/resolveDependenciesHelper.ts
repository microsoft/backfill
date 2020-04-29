import { setupFixture } from "backfill-utils-test";

import { getYarnWorkspaces } from "../workspaces/yarnWorkspaces";
import { getPnpmWorkspaces } from "../workspaces/pnpmWorkspaces";
import { getRushWorkspaces } from "../workspaces/rushWorkspaces";

export async function filterDependenciesInYarnFixture(
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

export async function filterDependenciesInPnpmFixture(
  fixture: string,
  filterFunction: any
) {
  const packageRoot = await setupFixture(fixture);
  const workspacesPackageInfo = getPnpmWorkspaces(packageRoot);

  const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

  const filteredDependencies = filterFunction(
    dependencies,
    workspacesPackageInfo
  );

  return filteredDependencies;
}

export async function filterDependenciesInRushFixture(
  fixture: string,
  filterFunction: any
) {
  const packageRoot = await setupFixture(fixture);
  const workspacesPackageInfo = getRushWorkspaces(packageRoot);

  const dependencies = { "package-a": "1.0.0", foo: "1.0.0" };

  const filteredDependencies = filterFunction(
    dependencies,
    workspacesPackageInfo
  );

  return filteredDependencies;
}
