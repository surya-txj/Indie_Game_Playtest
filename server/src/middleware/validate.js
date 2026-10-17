/**
 * Zod-validates the given parts of the request. Parsed (coerced, stripped)
 * values replace the raw ones. A ZodError reaches the error handler as a 400.
 */
export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    try {
      if (params) req.params = params.parse(req.params);
      if (query) req.query = query.parse(req.query);
      if (body) req.body = body.parse(req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
}
