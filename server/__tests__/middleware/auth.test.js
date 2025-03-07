const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { protect, authorize } = require('../../middleware/auth');
const User = require('../../models/User');
const ErrorResponse = require('../../utils/errorResponse');

describe('Auth Middleware Test', () => {
  let mockReq;
  let mockRes;
  let nextFunction;
  let user;

  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();

    // Create test user
    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
  });

  describe('protect middleware', () => {
    it('should return 401 if no token is provided', async () => {
      mockReq = {
        headers: {},
        cookies: {}
      };

      await protect(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ErrorResponse)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should verify Bearer token from headers', async () => {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      mockReq = {
        headers: {
          authorization: `Bearer ${token}`
        },
        cookies: {}
      };

      await protect(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toEqual(user.id);
    });

    it('should verify token from cookies', async () => {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      mockReq = {
        headers: {},
        cookies: {
          token
        }
      };

      await protect(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toEqual(user.id);
    });

    it('should return 401 for invalid token', async () => {
      mockReq = {
        headers: {
          authorization: 'Bearer invalid-token'
        },
        cookies: {}
      };

      await protect(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ErrorResponse)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('authorize middleware', () => {
    beforeEach(() => {
      mockReq = {
        user: {
          role: 'user'
        }
      };
    });

    it('should allow access for authorized role', () => {
      const middleware = authorize('user', 'admin');
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalledWith(
        expect.any(ErrorResponse)
      );
    });

    it('should deny access for unauthorized role', () => {
      const middleware = authorize('admin');
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(ErrorResponse)
      );
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
    });

    it('should handle multiple roles correctly', () => {
      mockReq.user.role = 'moderator';
      const middleware = authorize('admin', 'moderator');
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(nextFunction).not.toHaveBeenCalledWith(
        expect.any(ErrorResponse)
      );
    });

    it('should include role in error message', () => {
      const middleware = authorize('admin');
      middleware(mockReq, mockRes, nextFunction);

      expect(nextFunction.mock.calls[0][0].message).toContain('user');
      expect(nextFunction.mock.calls[0][0].message).toContain('not authorized');
    });
  });
});