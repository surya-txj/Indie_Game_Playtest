import { env, EMBEDDING_DIMENSIONS } from '../src/config/env.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Report } from '../src/models/index.js';

const definition = {
  fields: [
    { type: 'vector', path: 'embedding', numDimensions: EMBEDDING_DIMENSIONS, similarity: 'cosine' },
    { type: 'filter', path: 'studioId' },
    { type: 'filter', path: 'gameId' },
    { type: 'filter', path: 'buildId' },
    { type: 'filter', path: 'sessionId' },
    { type: 'filter', path: 'deletedAt' },
  ],
};

async function main() {
  await connectDB();
  // The collection must exist before a search index can be created on it.
  await Report.createCollection().catch(() => {});
  const collection = Report.collection;
  const existing = await collection.listSearchIndexes(env.VECTOR_INDEX_NAME).toArray();
  if (existing.length) {
    await collection.updateSearchIndex(env.VECTOR_INDEX_NAME, definition);
    console.log(`Updated search index "${env.VECTOR_INDEX_NAME}" (status: ${existing[0].status}).`);
  } else {
    await collection.createSearchIndex({ name: env.VECTOR_INDEX_NAME, type: 'vectorSearch', definition });
    console.log(`Created search index "${env.VECTOR_INDEX_NAME}". Atlas takes a minute to build it.`);
  }
}

main()
  .catch((err) => {
    console.error(`Could not create the vector index: ${err.message}`);
    console.error('This needs MongoDB Atlas (or Atlas local). The app still works using the Node cosine fallback.');
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
