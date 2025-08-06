import { cacheConfigEnvNames as envNames } from "./cacheConfig";

export type NpmCacheStorageOptions = {
  /** Package name to publish */
  npmPackageName: string;
  /** URL of the npm registry */
  registryUrl: string;
  /** Path to a custom .npmrc file to use in place of `$HOME/.npmrc` */
  npmrcUserconfig?: string;
};

export type NpmCacheStorageConfig = {
  provider: "npm";
  options: NpmCacheStorageOptions;
};

export function getNpmConfigFromSerializedOptions(
  options: string
): NpmCacheStorageConfig {
  let parsedOptions: NpmCacheStorageOptions;
  try {
    parsedOptions = JSON.parse(options);
  } catch {
    throw new Error(
      `Could not parse ${envNames.cacheProviderOptions} as JSON:\n"${options}"`
    );
  }

  if (
    typeof parsedOptions.npmPackageName !== "string" ||
    typeof parsedOptions.registryUrl !== "string"
  ) {
    throw new Error(
      `Invalid ${envNames.cacheProviderOptions} for ${envNames.cacheProvider}="npm":\n` +
        `Expected: object with string values for keys "npmPackageName", "registryUrl"\n` +
        `Received: "${options}"`
    );
  }

  return {
    provider: "npm",
    options: parsedOptions,
  };
}
