const ErrorResponse = require('../../utils/errorResponse');

describe('ErrorResponse Utility Test', () => {
  it('should create error with message and status code', () => {
    const message = 'Test error message';
    const statusCode = 400;
    const error = new ErrorResponse(message, statusCode);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe(message);
    expect(error.statusCode).toBe(statusCode);
  });

  it('should inherit from Error class', () => {
    const error = new ErrorResponse('Test error', 404);
    expect(error instanceof Error).toBe(true);
    expect(error.stack).toBeDefined();
  });

  it('should handle different status codes', () => {
    const testCases = [
      { message: 'Bad Request', code: 400 },
      { message: 'Unauthorized', code: 401 },
      { message: 'Forbidden', code: 403 },
      { message: 'Not Found', code: 404 },
      { message: 'Server Error', code: 500 }
    ];

    testCases.forEach(({ message, code }) => {
      const error = new ErrorResponse(message, code);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(code);
    });
  });

  it('should preserve error message when converting to string', () => {
    const message = 'Test error message';
    const error = new ErrorResponse(message, 400);
    expect(error.toString()).toContain(message);
  });
});