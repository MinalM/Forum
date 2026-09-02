// Single source of truth for resolving a user's avatar to a URL the
// browser can actually load. `User.avatar` used to default to the bare
// string 'default-avatar.jpg', which resolves relative to the current
// route (e.g. /posts/default-avatar.jpg) instead of to a real asset.
const DEFAULT_AVATAR = '/images/default-avatar1.png';
const LEGACY_DEFAULT_FILENAME = 'default-avatar.jpg';

export function getAvatarUrl(avatar) {
  if (!avatar || avatar === LEGACY_DEFAULT_FILENAME) {
    return DEFAULT_AVATAR;
  }
  if (avatar.startsWith('http') || avatar.startsWith('/')) {
    return avatar;
  }
  return `/images/${avatar}`;
}
