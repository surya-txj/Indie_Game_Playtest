import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));
  app.use(express.json({ limit: '1mb' }));
  app.use(mongoSanitize());

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
