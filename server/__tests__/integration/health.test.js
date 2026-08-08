const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');

describe('GET /api/health', () => {
  beforeAll(async () => {
    await mongoose.connect(global.__MONGO_URI__);
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('reports UP status and the current mongoose readyState', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.dbState).toBe(mongoose.connection.readyState);
    expect(res.body.dbState).toBe(1);
  });

  it('reflects a disconnected dbState via the health endpoint instead of the process going down', async () => {
    await mongoose.connection.close();

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.dbState).toBe(0);

    // Reconnect so later tests/hooks in this file see a live connection.
    await mongoose.connect(global.__MONGO_URI__);
  });

  it('does not crash the process when the mongo connection emits a post-startup error (e.g. a monitor timeout)', () => {
    expect(() => {
      mongoose.connection.emit('error', new Error('simulated monitor timeout'));
    }).not.toThrow();
  });
});
