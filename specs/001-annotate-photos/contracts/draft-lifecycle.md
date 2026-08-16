# Contract: Local Draft Lifecycle

## Persistence boundary

Compressed source Blobs and canonical editor state are stored in a versioned IndexedDB database.
Cache Storage contains only application assets. A UI claim of “Saved locally” is valid only after the
transaction's completion resolves successfully.

## Lifecycle

1. Before accepting files, check count/limits and storage headroom.
2. Create the session, accepted source Blobs, and initial state in one transaction.
3. After each completed interaction, increment `revision` and persist the canonical state.
4. During drag/resize, debounce intermediate updates and flush on pointer release, cancellation, page
   visibility change, and before export review.
5. On reopen, migrate additively and restore the newest fully committed revision.
6. Remove the restorable draft only after every non-omitted output is handed off successfully or the
   user explicitly confirms discard.
7. Quota, migration, or persistence failure retains the in-memory session where possible and exposes
   a retry/actionable state; it never pretends the draft is saved.

## Durability disclosure

Local recovery is not a permanent backup. Site-data clearing, browser eviction, origin/scope changes,
or private-mode termination can remove it. `navigator.storage.persist() === false` is a supported
outcome and MUST be disclosed without blocking in-memory editing.

## Migration and rollback

- Database and record schema versions are separate.
- Migrations are additive and transactional; old records are not deleted before commit.
- Unknown newer records are left untouched and produce an explicit incompatible-version result.
- A failed migration leaves the previous application version's data readable.
- Manifest `id`, origin, service-worker scope, and database name are persisted public contracts.

## Required verification

Cover reload/reopen restoration, committed-revision selection, successful-export cleanup, explicit
discard, partial export, persistence denial, quota exhaustion, migration success/failure, and source
Blob digest stability. Private mode is excluded and must be reported as such.
