/**
 * Applied to every schema: removes secrets and internals from JSON output so a
 * stray `res.json(doc)` can never leak a password hash or a 768-number vector.
 */
const HIDDEN_FIELDS = ['passwordHash', 'embedding', 'tokenHash', '__v'];

export function cleanJSON(schema) {
  const transform = (doc, ret) => {
    for (const field of HIDDEN_FIELDS) delete ret[field];
    return ret;
  };
  schema.set('toJSON', { virtuals: false, transform });
  schema.set('toObject', { virtuals: false, transform });
}
