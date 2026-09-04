const path = require('path');
const {
  STATIC_ROUTES,
  buildPostRoutes,
  resolveRoutes,
  routeToOutputPath,
  isPostRoute,
  fetchRecentPostIds
} = require('../../../scripts/prerender');

describe('scripts/prerender', () => {
  describe('buildPostRoutes', () => {
    it('maps post ids to /posts/:id routes', () => {
      expect(buildPostRoutes(['a', 'b'])).toEqual(['/posts/a', '/posts/b']);
    });

    it('dedupes repeated ids', () => {
      expect(buildPostRoutes(['a', 'a', 'b'])).toEqual(['/posts/a', '/posts/b']);
    });

    it('drops falsy ids', () => {
      expect(buildPostRoutes(['a', null, undefined, ''])).toEqual(['/posts/a']);
    });
  });

  describe('resolveRoutes', () => {
    it('combines the static routes with post routes by default', () => {
      expect(resolveRoutes({ postIds: ['p1'] })).toEqual([...STATIC_ROUTES, '/posts/p1']);
    });

    it('dedupes when a static route collides with a generated one', () => {
      expect(resolveRoutes({ staticRoutes: ['/', '/posts/p1'], postIds: ['p1'] })).toEqual([
        '/',
        '/posts/p1'
      ]);
    });

    it('returns just the static routes when there are no posts', () => {
      expect(resolveRoutes({ postIds: [] })).toEqual(STATIC_ROUTES);
    });
  });

  describe('routeToOutputPath', () => {
    it('maps the root route to <buildDir>/index.html', () => {
      expect(routeToOutputPath('/build', '/')).toBe(path.join('/build', 'index.html'));
    });

    it('maps a single-segment route to <buildDir>/<segment>/index.html', () => {
      expect(routeToOutputPath('/build', '/categories')).toBe(
        path.join('/build', 'categories', 'index.html')
      );
    });

    it('maps a post route to a nested directory', () => {
      expect(routeToOutputPath('/build', '/posts/abc123')).toBe(
        path.join('/build', 'posts', 'abc123', 'index.html')
      );
    });

    it('tolerates a trailing slash', () => {
      expect(routeToOutputPath('/build', '/categories/')).toBe(
        path.join('/build', 'categories', 'index.html')
      );
    });
  });

  describe('isPostRoute', () => {
    it('matches /posts/:id', () => {
      expect(isPostRoute('/posts/abc123')).toBe(true);
    });

    it('rejects the posts list and nested post paths', () => {
      expect(isPostRoute('/posts')).toBe(false);
      expect(isPostRoute('/posts/abc123/comments')).toBe(false);
      expect(isPostRoute('/categories')).toBe(false);
    });
  });

  describe('fetchRecentPostIds', () => {
    it('returns the ids from a successful response, most-recent-first order preserved', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ _id: 'p2' }, { _id: 'p1' }] })
      });

      const ids = await fetchRecentPostIds('http://api.test', 5, fetchImpl);

      expect(ids).toEqual(['p2', 'p1']);
      expect(fetchImpl).toHaveBeenCalledWith('http://api.test/api/posts?limit=5&sort=-createdAt');
    });

    it('strips a trailing slash from the API URL before building the request', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });

      await fetchRecentPostIds('http://api.test/', 5, fetchImpl);

      expect(fetchImpl).toHaveBeenCalledWith('http://api.test/api/posts?limit=5&sort=-createdAt');
    });

    it('degrades to an empty list, without throwing, on a non-2xx response', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500 });

      await expect(fetchRecentPostIds('http://api.test', 5, fetchImpl)).resolves.toEqual([]);
    });

    it('degrades to an empty list, without throwing, when the API is unreachable', async () => {
      const fetchImpl = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(fetchRecentPostIds('http://api.test', 5, fetchImpl)).resolves.toEqual([]);
    });

    it('drops posts missing an id', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ _id: 'p1' }, { title: 'no id' }] })
      });

      await expect(fetchRecentPostIds('http://api.test', 5, fetchImpl)).resolves.toEqual(['p1']);
    });
  });
});
