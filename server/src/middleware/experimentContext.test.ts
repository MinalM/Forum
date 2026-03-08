import { Request, Response, NextFunction } from 'express';
import { experimentContextMiddleware } from './experimentContext';

const mockNext: NextFunction = jest.fn();
const mockRes = {} as Response;

describe('experimentContextMiddleware', () => {
  it('builds ExperimentUser from authenticated user', () => {
    const req = {
      user: { id: 'abc123', email: 'alice@example.com', role: 'user', authProvider: 'local' },
    } as any;

    experimentContextMiddleware(req, mockRes, mockNext);

    expect(req.experimentUser).toEqual({
      userID: 'abc123',
      email: 'alice@example.com',
      custom: { role: 'user', authProvider: 'local' },
    });
    expect(mockNext).toHaveBeenCalled();
  });

  it('builds anonymous ExperimentUser when no user on request', () => {
    const req = { user: undefined, sessionID: 'sess-xyz' } as any;

    experimentContextMiddleware(req, mockRes, mockNext);

    expect(req.experimentUser.userID).toBe('anon-sess-xyz');
    expect(mockNext).toHaveBeenCalled();
  });
});
