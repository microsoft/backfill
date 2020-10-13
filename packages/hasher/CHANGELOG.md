# Change Log - backfill-hasher

This log was last generated on Tue, 13 Oct 2020 08:40:08 GMT and should not be manually modified.

<!-- Start content -->

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

- Include file path in hash. Addresses a bug where file renames do not produce new hash. (bewegger@microsoft.com)

## 6.0.1

Fri, 17 Jul 2020 19:27:19 GMT

### Patches

- bumping workspace-tools to allow accepting a PREFFERRED_WORKSPACE_MANAGER when multiple lock files implementations exist in one repo (kchau@microsoft.com)

## 6.0.0

Tue, 09 Jun 2020 11:50:22 GMT

### Major changes

- always use ** as hash glob (vibailly@tuta.io)
