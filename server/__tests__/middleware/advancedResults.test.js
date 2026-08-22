const advancedResults = require('../../middleware/advancedResults');

// A minimal fake of a Mongoose model + chainable Query, just enough to
// exercise advancedResults' query-building logic without a real database
// (mongodb-memory-server's binary download is blocked in this environment).
function makeFakeModel({ modelName, collectionName, results = [] }) {
  const calls = { find: [], sort: [], countDocuments: [] };

  const query = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn(function (sortBy) {
      calls.sort.push(sortBy);
      return this;
    }),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    then: (resolve) => resolve(results)
  };

  const model = {
    modelName,
    collection: { name: collectionName },
    find: jest.fn((filter) => {
      calls.find.push(filter);
      return query;
    }),
    countDocuments: jest.fn((filter) => {
      calls.countDocuments.push(filter);
      return Promise.resolve(results.length);
    })
  };

  return { model, calls };
}

function makeReqRes(query) {
  const req = { query };
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('advancedResults feed handling (unit)', () => {
  it('applies no feed filter/sort when feed is omitted, even for the Post model', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Post', collectionName: 'posts' });
    const { req, res, next } = makeReqRes({});

    await advancedResults(model)(req, res, next);

    expect(calls.find[0]).toEqual({});
    expect(calls.sort[0]).toBe('-createdAt');
    expect(next).toHaveBeenCalled();
  });

  it('filters to commentCount: 0 and sorts oldest-first for feed=unanswered', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Post', collectionName: 'posts' });
    const { req, res, next } = makeReqRes({ feed: 'unanswered' });

    await advancedResults(model)(req, res, next);

    expect(calls.find[0]).toEqual({ $and: [{}, { commentCount: 0 }] });
    expect(calls.sort[0]).toBe('createdAt');
  });

  it('filters by since window and sorts by score desc for feed=top', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Post', collectionName: 'posts' });
    const before = Date.now();
    const { req, res, next } = makeReqRes({ feed: 'top', since: '7d' });

    await advancedResults(model)(req, res, next);

    const filter = calls.find[0];
    expect(filter.$and[0]).toEqual({});
    expect(filter.$and[1].createdAt.$gte).toBeInstanceOf(Date);
    const expectedFloor = before - 7 * 24 * 60 * 60 * 1000;
    expect(filter.$and[1].createdAt.$gte.getTime()).toBeGreaterThanOrEqual(expectedFloor - 1000);
    expect(calls.sort[0]).toBe('-score');
  });

  it('defaults the top window to 7 days when since is omitted', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Post', collectionName: 'posts' });
    const before = Date.now();
    const { req, res, next } = makeReqRes({ feed: 'top' });

    await advancedResults(model)(req, res, next);

    const gte = calls.find[0].$and[1].createdAt.$gte.getTime();
    const expectedFloor = before - 7 * 24 * 60 * 60 * 1000;
    expect(gte).toBeGreaterThanOrEqual(expectedFloor - 1000);
    expect(gte).toBeLessThanOrEqual(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1000);
  });

  it('falls back to recent (no filter, default sort) for an unrecognised feed value', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Post', collectionName: 'posts' });
    const { req, res, next } = makeReqRes({ feed: 'bogus' });

    await advancedResults(model)(req, res, next);

    expect(calls.find[0]).toEqual({});
    expect(calls.sort[0]).toBe('-createdAt');
  });

  it('lets an explicit sort override the feed default sort', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Post', collectionName: 'posts' });
    const { req, res, next } = makeReqRes({ feed: 'unanswered', sort: 'title' });

    await advancedResults(model)(req, res, next);

    expect(calls.sort[0]).toBe('title');
  });

  it('adds unansweredCount to the envelope for the Post model, independent of the active feed', async () => {
    const { model } = makeFakeModel({ modelName: 'Post', collectionName: 'posts', results: [{ _id: 1 }] });
    const { req, res, next } = makeReqRes({ feed: 'top' });

    await advancedResults(model)(req, res, next);

    expect(model.countDocuments).toHaveBeenCalledWith({ commentCount: 0 });
    expect(res.advancedResults.unansweredCount).toBe(1);
  });

  it('does not add unansweredCount for non-Post models', async () => {
    const { model } = makeFakeModel({ modelName: 'Category', collectionName: 'categories' });
    const { req, res, next } = makeReqRes({});

    await advancedResults(model)(req, res, next);

    expect(res.advancedResults.unansweredCount).toBeUndefined();
  });

  it('ignores feed entirely for non-Post models', async () => {
    const { model, calls } = makeFakeModel({ modelName: 'Category', collectionName: 'categories' });
    const { req, res, next } = makeReqRes({ feed: 'unanswered' });

    await advancedResults(model)(req, res, next);

    expect(calls.find[0]).toEqual({});
    expect(calls.sort[0]).toBe('-createdAt');
  });
});
