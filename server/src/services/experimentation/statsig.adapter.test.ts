import { StatsigAdapter } from './statsig.adapter';

// Mock the entire statsig-node module
jest.mock('statsig-node', () => ({
  initialize: jest.fn().mockResolvedValue(undefined),
  checkGate: jest.fn(),
  getExperiment: jest.fn(),
  logEvent: jest.fn(),
  shutdown: jest.fn().mockResolvedValue(undefined),
}));

import statsig from 'statsig-node';

const mockUser = { userID: 'user-123', email: 'test@example.com' };

describe('StatsigAdapter', () => {
  let adapter: StatsigAdapter;

  beforeEach(async () => {
    jest.clearAllMocks();
    adapter = new StatsigAdapter('fake-secret-key');
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.shutdown();
  });

  describe('initialize', () => {
    it('logs warning and does not throw when statsig.initialize fails', async () => {
      (statsig.initialize as jest.Mock).mockRejectedValueOnce(new Error('init failed'));
      const failAdapter = new StatsigAdapter('bad-key');
      await expect(failAdapter.initialize()).resolves.toBeUndefined();
    });
  });

  describe('evaluateFlag', () => {
    it('returns true when gate is enabled', async () => {
      (statsig.checkGate as jest.Mock).mockResolvedValue(true);
      const result = await adapter.evaluateFlag('test-flag', mockUser, false);
      expect(result).toBe(true);
    });

    it('returns defaultValue when statsig throws', async () => {
      (statsig.checkGate as jest.Mock).mockRejectedValue(new Error('network error'));
      const result = await adapter.evaluateFlag('test-flag', mockUser, false);
      expect(result).toBe(false);
    });
  });

  describe('getVariant', () => {
    it('returns experiment group name', async () => {
      (statsig.getExperiment as jest.Mock).mockResolvedValue({
        get: () => 'treatment',
      });
      const result = await adapter.getVariant('sort-order-test', mockUser);
      expect(result).toBe('treatment');
    });

    it('returns control when statsig throws', async () => {
      (statsig.getExperiment as jest.Mock).mockRejectedValue(new Error('error'));
      const result = await adapter.getVariant('sort-order-test', mockUser);
      expect(result).toBe('control');
    });
  });

  describe('logOutcome', () => {
    it('calls statsig.logEvent without throwing', () => {
      (statsig.logEvent as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
      // Should NOT throw even if statsig fails
      expect(() => adapter.logOutcome('post_created', mockUser)).not.toThrow();
    });
  });
});
