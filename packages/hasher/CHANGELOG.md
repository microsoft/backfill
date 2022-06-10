# Change Log - backfill-hasher

This log was last generated on Fri, 10 Jun 2022 18:21:21 GMT and should not be manually modified.

<!-- Start content -->

## 6.4.0

Fri, 10 Jun 2022 18:21:21 GMT

### Minor changes

- Adds a "fast path" for hashing files in a package by using a look up tree (kchau@microsoft.com)

## 6.3.0

Thu, 31 Mar 2022 05:28:57 GMT

### Minor changes

- Upgrading package-deps-hash version. (dzearing@microsoft.com)

## 6.2.9

Thu, 13 Jan 2022 19:46:10 GMT

### Patches

- fixing platform differences in a monorepo, added tests (kchau@microsoft.com)

## 6.2.8

Fri, 07 Jan 2022 21:26:53 GMT

### Patches

- bumps the workspace-tools (kchau@microsoft.com)

## 6.2.7

Fri, 07 Jan 2022 16:43:20 GMT

### Patches

- speeding up the hasher by reducing wasted calculations (kchau@microsoft.com)

## 6.2.5

Tue, 22 Jun 2021 14:38:58 GMT

### Patches

- Fix: files from a different package are included in the hash.
  (vibailly@microsoft.com)

## 6.2.2

Tue, 27 Apr 2021 08:32:03 GMT

### Patches

- Bump @types/fs-extra from 8.0.1 to 9.0.11 (ronald.ndirangu@gmail.com)

## 6.2.1

Fri, 23 Apr 2021 23:51:52 GMT

### Patches

- bumps workspace-tools to take advantage of the faster boot of the lib
  (34725+kenotron@users.noreply.github.com)

## 6.2.0

Tue, 01 Dec 2020 09:43:25 GMT

### Minor changes

- Bump typescript from 3.7.4 to 4.1.2 (bewegger@microsoft.com)

## 6.1.5

Tue, 01 Dec 2020 09:13:42 GMT

### Patches

- Run Prettier 2.2.0 (bewegger@microsoft.com)

## 6.1.4

Tue, 01 Dec 2020 09:06:20 GMT

### Patches

- Bump find-up from 4.1.0 to 5.0.0 (bewegger@microsoft.com)

## 6.1.3

Wed, 18 Nov 2020 10:47:24 GMT

### Patches

- fix phantom dependencies (vincent.bailly@microsoft.com)

## 6.1.2

Tue, 13 Oct 2020 08:40:08 GMT

### Patches

- Use workspace root instead of git root (bewegger@microsoft.com)

## 6.1.1

Mon, 31 Aug 2020 15:41:56 GMT

### Patches

- Update package-deps-hash (bewegger@microsoft.com)

## 6.1.0

Tue, 18 Aug 2020 16:03:05 GMT

### Minor changes

- Include file path in hash. Addresses a bug where file renames do not produce
  new hash. (bewegger@microsoft.com)

## 6.0.1

Fri, 17 Jul 2020 19:27:19 GMT

### Patches

- bumping workspace-tools to allow accepting a PREFFERRED_WORKSPACE_MANAGER when
  multiple lock files implementations exist in one repo (kchau@microsoft.com)

## 6.0.0

Tue, 09 Jun 2020 11:50:22 GMT

### Major changes

- always use \*\* as hash glob (vibailly@tuta.io)
