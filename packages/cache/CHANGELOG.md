# Change Log - backfill-cache

This log was last generated on Wed, 15 Nov 2023 23:08:02 GMT and should not be manually modified.

<!-- Start content -->

## 5.8.0

Wed, 15 Nov 2023 23:08:02 GMT

### Minor changes

- Add credential option for Azure Blob Storage (altinokd@microsoft.com)
- Bump backfill-config to v6.4.2

## 5.7.1

Tue, 05 Sep 2023 21:29:30 GMT

### Patches

- Bump @azure/storage-blob to ^12.15.0 (elcraig@microsoft.com)
- Update typescript to 4.3 (elcraig@microsoft.com)
- Remove unused dependencies (elcraig@microsoft.com)
- Bump backfill-config to v6.4.1
- Bump backfill-logger to v5.2.1

## 5.7.0

Tue, 05 Sep 2023 19:56:47 GMT

### Minor changes

- Require Node 14; add downlevel syntax compilation to ES2020 for Node 14 (elcraig@microsoft.com)
- Bump backfill-config to v6.4.0
- Bump backfill-logger to v5.2.0

## 5.6.4

Thu, 13 Apr 2023 20:28:21 GMT

### Patches

- Delay load azure blob storage (elcraig@microsoft.com)

## 5.6.3

Thu, 08 Dec 2022 02:52:13 GMT

### Patches

- Update dependency execa to v5 (renovate@whitesourcesoftware.com)
- Bump backfill-config to v6.3.1
- Bump backfill-utils-test to v5.1.3

## 5.6.2

Fri, 16 Sep 2022 00:21:39 GMT

### Patches

- Simplify some logic to remove lint issues (elcraig@microsoft.com)

## 5.6.1

Thu, 19 May 2022 12:02:01 GMT

### Patches

- Azure blob storage timeout (vibailly@microsoft.com)

## 5.6.0

Wed, 18 May 2022 12:15:03 GMT

### Minor changes

- Make incremental cache an opt-in option (vibailly@microsoft.com)

## 5.5.0

Mon, 25 Apr 2022 13:30:56 GMT

### Minor changes

- use mtime instead of hash (vibailly@microsoft.com)

## 5.4.1

Wed, 20 Apr 2022 12:32:29 GMT

### Patches

- filter unchanged files did not work (vincent.bailly@microsoft.com)

## 5.4.0

Thu, 31 Mar 2022 05:28:57 GMT

### Minor changes

- Upgrading package-deps-hash version. (dzearing@microsoft.com)

## 5.3.0

Tue, 12 Oct 2021 19:45:45 GMT

### Minor changes

- feat: adds a way to set up custom cache storage provider classes
  (kchau@microsoft.com)

## 5.2.6

Tue, 21 Sep 2021 22:29:42 GMT

### Patches

- Fix git root detection in worktrees (elcraig@microsoft.com)

## 5.2.5

Sat, 31 Jul 2021 21:38:03 GMT

### Patches

- Speeds up put memoized hash calculation as well as fixing a bug in the path
  normalization (ken@gizzar.com)

## 5.2.4

Thu, 06 May 2021 13:46:20 GMT

### Patches

- opt-in to optimize cache size (vibailly@microsoft.com)

## 5.2.3

Tue, 27 Apr 2021 09:06:13 GMT

### Patches

- Bump @types/node from 13.13.35 to 14.14.41 (ronald.ndirangu@gmail.com)

## 5.2.1

Tue, 27 Apr 2021 08:32:03 GMT

### Patches

- Bump @types/fs-extra from 8.0.1 to 9.0.11 (ronald.ndirangu@gmail.com)

## 5.2.0

Tue, 01 Dec 2020 09:43:25 GMT

### Minor changes

- Bump typescript from 3.7.4 to 4.1.2 (bewegger@microsoft.com)

## 5.1.6

Tue, 01 Dec 2020 09:13:42 GMT

### Patches

- Run Prettier 2.2.0 (bewegger@microsoft.com)

## 5.1.4

Wed, 18 Nov 2020 10:47:24 GMT

### Patches

- fix phantom dependencies (vincent.bailly@microsoft.com)

## 5.1.2

Sat, 06 Jun 2020 19:22:26 GMT

### Patches

- replace tar with tar-fs for more resilience (kchau@microsoft.com)
