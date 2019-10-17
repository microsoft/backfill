# backfill

A JavaScript caching library for reducing build time.

**🔌 Easy to install**: Simply wrap your build commands inside
`backfill -- [command]`  
**☁️ Remote cache**: Store your cache on Azure Blob or as an npm package  
**⚙️ Fully configurable**: Smart defaults with cross-package and per-package
configuration and environment variable overrides

_backfill is under active development and should probably not be used in
production, yet. We will initially focus on stability improvements. We will then
look into various optimization strategies, adding more customization, and
introducing an API for only running scripts in packages that have changed and
skipping others altogether. This is particularly useful for tests (such as Jest)
and for other dev tools that simply don't need to run if nothing has changed._

## Why

When you're working in a multi-package repo you don't want to re-build packages
that haven't changed. By wrapping your build scripts inside `backfill` you
enable storing and fetching of build output to and from a local or remote cache.

Backfill is based on two concepts:

1. **Hashing**: It will hash the files of a package, its dependencies and the
   build command
2. **Caching**: Using the hash key, it will look for build output from a local
   or remote cache. If there's a match, it will backfill the package using the
   cache. Otherwise, it will run the build command and persist the output to the
   cache.

## Install

Install backfill using yarn:

```
$ yarn add --dev backfill
```

Or npm:

```
$ npm install --save-dev backfill
```

## Usage

```
backfill -- [command]
```

Typically you would wrap your npm scripts inside `backfill`, like this:

```json
{
  "name": "package",
  "scripts": {
    "build": "backfill -- tsc -b"
  }
}
```

### `--audit`

Backfill can only bring back build output from the folders it was asked to
cache. A package that modifies or adds files outside of the cached folder will
not be brought back to the same state as when it was initially built. To help
you debug this you can add `--audit` to your `backfill` command. It will listen
to all file changes in your repo (it assumes you're in a git repo) while running
the build command and then report on any files that got changed outside of the
cache folder.

### Configuration

Backfill will look for `backfill.config.js` in the package it was called from
and among parent folders recursively and then combine those configs together.

To configure backfill, simply export a config object with the properties you
wish to override:

```js
module.exports = {
  cacheStorageConfig: {
    provider: "azure-blob",
    options: { ... }
  }
};
```

The default configuration object is:

```js
{
  cacheStorageConfig: { provider: "local" },
  internalCacheFolder: "node_modules/.cache/backfill",
  logFolder: "node_modules/.cache/backfill",
  name: "name-of-package",
  outputFolder: "lib",
  producePerformanceLogs: false,
  packageRoot: "path/to/package",
  clearOutputFolder: false,
  logLevel: "info",
  hashGlobs: ["**/*", "!**/node_modules/**", "!lib/**", "!**/tsconfig.tsbuildinfo"]
}
```

The `outputFolder` is the folder you want to cache. It can either be a string or
an array of strings. `outputFolder` should be expressed as a relative path from
the root of each package. If you want to cache `package-a/lib`, for instance,
you'd write `outputFolder: "lib"`. If you also want to cache the
`pacakge/a/dist/bundles` folder, you'd write
`outputFolder: ["lib", "dist/bundles"]`.

The configuration type is:

```ts
export type Config = {
  cacheStorageConfig: CacheStorageConfig;
  internalCacheFolder: string;
  logFolder: string;
  name: string;
  outputFolder: string | string[];
  producePerformanceLogs: boolean;
  packageRoot: string;
  performanceReportName?: string;
  clearOutputFolder: boolean;
  logLevel: LogLevels;
  hashGlobs: HashGlobs;
};
```

#### Environment variable

You can override configuration with environment variables. Backfill will also
look for a `.env`-file in the root of your repository, and load those into the
environment. This can be useful when you don't want to commit keys and secrets
to your remote cache, or if you want to commit a read-only cache access key in
the repo and override with a write and read access key in the PR build, for
instance.

See `getEnvConfig()` in
[`./packages/config/src/envConfig.ts`](https://github.com/microsoft/backfill/blob/master/packages/config/src/envConfig.ts#L15).

## Set up remote cache

### Microsoft Azure Blog Storage

To cache to a Microsoft Azure Blog Storage you need to provide a connection
string and the container name. If you are configuring via `backfill.config.js`,
you can use the following syntax:

```js
module.exports = {
  cacheStorageConfig: {
    provider: "azure-blob",
    options: {
      connectionString: "...",
      container: "..."
    }
  }
};
```

You can also configure Microsoft Azure Blog Storage using environment variables.

```
BACKFILL_CACHE_PROVIDER="azure-blob"
BACKFILL_CACHE_PROVIDER_OPTIONS='{"connectionString":"...","container":"..."}'
```

### Npm package

To cache to an NPM package you need to provide a package name and the registry
URL of your package feed. This feed should probably be private. If you are
configuring via `backfill.config.js`, you can use the following syntax:

```js
module.exports = {
  cacheStorageConfig: {
    provider: "npm",
    options: {
      npmPackageName: "...",
      registryUrl: "..."
    }
  }
};
```

You can also provide a path to the `.npmrc` user config file, to provide auth
details related to your package feed using the `npmrcUserconfig` field in
`options`.

You can also configure NPM package cache using environment variables.

```
BACKFILL_CACHE_PROVIDER="npm"
BACKFILL_CACHE_PROVIDER_OPTIONS='{"npmPackageName":"...","registryUrl":"..."}'
```

## Performance Logs

You can optionally output performance logs to disk. If turned on, backfill will
output a log file after each run with performance metrics. Each log file is
formatted as a csv file, containing only one row. You can run
`backfill --generate-performance-report` to combine all logs in the log folder
into one file. You can turn performance logging by setting
`producePerformanceLogs: true` in `backfill.config.js`.

## Contributing

This project welcomes contributions and suggestions.

- [Submit bugs](https://github.com/microsoft/backfill/issues) and help us verify
  fixes as they are checked in.
- Review the [source code changes](https://github.com/microsoft/backfill/pulls).

Most contributions require you to agree to a Contributor License Agreement (CLA)
declaring that you have the right to, and actually do, grant us the rights to
use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether
you need to provide a CLA and decorate the PR appropriately (e.g., status check,
comment). Simply follow the instructions provided by the bot. You will only need
to do this once across all repos using our CLA.

This project has adopted the
[Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the
[Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any
additional questions or comments.
