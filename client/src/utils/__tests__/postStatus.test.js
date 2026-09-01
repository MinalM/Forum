import { getPostStatus } from '../postStatus';

describe('getPostStatus', () => {
  it('returns "solved" for a solved post regardless of comments or lock state', () => {
    expect(getPostStatus({ isSolved: true, commentCount: 3, isLocked: false })).toBe('solved');
    expect(getPostStatus({ isSolved: true, commentCount: 0, isLocked: true })).toBe('solved');
  });

  it('returns "needs-answer" for an unsolved, unlocked post with no answers', () => {
    expect(getPostStatus({ isSolved: false, commentCount: 0, isLocked: false })).toBe('needs-answer');
  });

  it('returns null for an unsolved post that already has answers', () => {
    expect(getPostStatus({ isSolved: false, commentCount: 1, isLocked: false })).toBeNull();
  });

  it('returns null for a locked, unsolved post even with no answers', () => {
    expect(getPostStatus({ isSolved: false, commentCount: 0, isLocked: true })).toBeNull();
  });
});
