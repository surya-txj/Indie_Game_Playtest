import fs from 'node:fs/promises';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` } });
}

async function removeUploadedFiles(req) {
  const files = Array.isArray(req.files) ? req.files : Object.values(req.files ?? {}).flat();
  if (req.file) files.push(req.file);
  await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
}

function toApiError(err) {
  if (err instanceof ApiError) return err;
  if (err instanceof ZodError) {
    return ApiError.badRequest(
      'Validation failed',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  if (err instanceof multer.MulterError) {
    return ApiError.badRequest(err.message, [{ path: err.field ?? 'screenshots', message: err.code }]);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return ApiError.badRequest(
      'Validation failed',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  }
  if (err instanceof mongoose.Error.CastError) {
    return ApiError.notFound('Resource');
  }
  if (err?.code === 11000) {
    return ApiError.conflict('Duplicate value', [{ path: Object.keys(err.keyValue ?? {}).join(','), message: 'already exists' }]);
  }
  if (err?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Malformed JSON body');
  }
  return null;
}

// eslint-disable-next-line no-unused-vars
export async function errorHandler(err, req, res, next) {
  await removeUploadedFiles(req);

  const apiError = toApiError(err);
  if (!apiError) {
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }

  const body = { code: apiError.code, message: apiError.message };
  if (apiError.details !== undefined) body.details = apiError.details;
  res.status(apiError.status).json({ error: body });
}
