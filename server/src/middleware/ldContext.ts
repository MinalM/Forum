import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';

export const ldContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    const context = {
        kind: 'user',
        key: user ? user.id.toString() : 'anonymous',
        name: user ? user.name : undefined,
        email: user ? user.email : undefined,
        anonymous: !user
    };

    (req as any).ldContext = context;

    // Add to active span
    const span = trace.getActiveSpan();
    if (span) {
        span.setAttribute('ld.context.key', context.key);
    }

    next();
};
