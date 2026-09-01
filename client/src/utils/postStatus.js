// Single source of truth for the post status badge ("Solved" /
// "Needs an answer") so the feed (PostItem) and the thread page
// (PostDetail) can never disagree about what a post's state means.
export function getPostStatus({ isSolved, commentCount, isLocked }) {
  if (isSolved) return 'solved';
  if (isLocked) return null;
  return commentCount === 0 ? 'needs-answer' : null;
}
