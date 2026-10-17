import { env } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Report } from '../src/models/index.js';
import { embedReport } from '../src/services/embedding.js';

/** Embeds every live report that has no vector or one from a different model. */
async function main() {
  await connectDB();
  const reports = await Report.find({
    deletedAt: null,
    $or: [{ embeddingModel: { $ne: env.OLLAMA_EMBED_MODEL } }, { aiStatus: { $ne: 'ready' } }],
  });
  console.log(`${reports.length} report(s) need embedding with ${env.OLLAMA_EMBED_MODEL}.`);
  let ok = 0;
  for (const report of reports) {
    const result = await embedReport(report);
    if (result.ok) ok += 1;
    else {
      console.error(`Stopped: ${result.error}`);
      break;
    }
  }
  console.log(`Embedded ${ok}/${reports.length}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
