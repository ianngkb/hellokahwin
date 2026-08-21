// Chunked bulk DML helper.
//
// Why: Spec A (migration 0075, 2026-05-04) caps `postgres` and `service_role`
// statement_timeout at 30s. Some admin operations legitimately touch tens of
// thousands of rows (user-delete-with-ownership-transfer reassigns media;
// settings resets clear analytics tables). A single statement on the whole
// set hits the cap and fails partway with SQLSTATE 57014. This helper runs
// the operation in batches, each batch being its own statement well under
// the cap.
//
// Spec: _bmad-output/implementation-artifacts/spec-chunked-admin-bulk-dml.md
//
// Usage pattern (caller writes a CTE that picks N rows and does the DML):
//
//   await runChunkedBulk('user-delete media reassignment', async () => {
//     const result = await db.execute(sql`
//       WITH batch AS (
//         SELECT id FROM media WHERE uploaded_by = ${oldId} ORDER BY id LIMIT 5000
//       )
//       UPDATE media SET uploaded_by = ${newId} WHERE id IN (SELECT id FROM batch)
//     `);
//     return result.rowCount ?? 0;
//   });
//
// The loop terminates when a batch returns fewer than batchSize rows. Each
// batch is its own implicit transaction (the helper does NOT wrap in a tx)
// so partial progress survives a mid-loop crash. Callers are responsible for
// idempotency — typically a `WHERE` filter that only matches not-yet-handled
// rows so a re-run resumes cleanly.

const DEFAULT_BATCH_SIZE = 5000;
const DEFAULT_MAX_ITERATIONS = 10000; // 5000 × 10000 = 50 M rows defensive ceiling

export interface ChunkedBulkOptions {
  batchSize?: number;
  // Defensive iteration cap. Exposed for tests (so they can use a small cap
  // and run fast) and for callers that know their data is bounded smaller.
  maxIterations?: number;
}

export interface ChunkedBulkResult {
  totalRows: number;
  batchCount: number;
}

export async function runChunkedBulk(
  label: string,
  runBatch: () => Promise<number>,
  options: ChunkedBulkOptions = {},
): Promise<ChunkedBulkResult> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  let totalRows = 0;
  let batchCount = 0;

  while (batchCount < maxIterations) {
    const affected = await runBatch();
    totalRows += affected;
    batchCount++;
    if (affected < batchSize) break;
  }

  if (batchCount >= maxIterations) {
    throw new Error(
      `[chunked-bulk] ${label}: exceeded ${maxIterations} iterations (total: ${totalRows} rows). ` +
        `The runBatch callback may have a bug that returns >= batchSize indefinitely.`,
    );
  }

  console.log(`[chunked-bulk] ${label}: ${totalRows} rows in ${batchCount} batches`);
  return { totalRows, batchCount };
}
