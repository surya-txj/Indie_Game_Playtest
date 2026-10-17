export function cosineSimilarity(a, b) {
  if (!a?.length || a.length !== b?.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Same scale Atlas `$vectorSearch` reports for cosine: (1 + cos) / 2, in [0, 1]. */
export function similarityScore(a, b) {
  return (1 + cosineSimilarity(a, b)) / 2;
}
