import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { ExperimentUser } from '../types/experimentation';

export const experimentContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;

  const experimentUser: ExperimentUser = user
    ? {
        userID: user.id.toString(),
        email: user.email,
        custom: {
          role: user.role,
          authProvider: user.authProvider,
        },
      }
    : {
        userID: `anon-${(req as any).sessionID || 'unknown'}`,
      };

  (req as any).experimentUser = experimentUser;

  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute('experiment.user.id', experimentUser.userID);
  }

  next();
};
