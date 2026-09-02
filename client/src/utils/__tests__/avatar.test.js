import { getAvatarUrl } from '../avatar';

describe('getAvatarUrl', () => {
  it('returns the default asset when avatar is missing', () => {
    expect(getAvatarUrl(undefined)).toBe('/images/default-avatar1.png');
    expect(getAvatarUrl(null)).toBe('/images/default-avatar1.png');
    expect(getAvatarUrl('')).toBe('/images/default-avatar1.png');
  });

  it('resolves the legacy bare default filename to the real asset', () => {
    expect(getAvatarUrl('default-avatar.jpg')).toBe('/images/default-avatar1.png');
  });

  it('passes through an absolute URL unchanged', () => {
    expect(getAvatarUrl('https://lh3.googleusercontent.com/a/photo.jpg')).toBe(
      'https://lh3.googleusercontent.com/a/photo.jpg'
    );
  });

  it('passes through a path already rooted at /', () => {
    expect(getAvatarUrl('/images/some-uploaded-avatar.png')).toBe(
      '/images/some-uploaded-avatar.png'
    );
  });

  it('resolves a bare filename to /images/<file>', () => {
    expect(getAvatarUrl('uploaded-avatar.png')).toBe('/images/uploaded-avatar.png');
  });
});
