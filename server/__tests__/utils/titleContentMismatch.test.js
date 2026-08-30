const { extractEmbeddedTitle, isTitleContentMismatch } = require('../../utils/titleContentMismatch');

describe('titleContentMismatch', () => {
  describe('extractEmbeddedTitle', () => {
    it('returns null when content has no leading "Title:" line', () => {
      expect(extractEmbeddedTitle('What are the best resources for ML?')).toBeNull();
    });

    it('extracts the subject from a leading "Title:" line', () => {
      expect(extractEmbeddedTitle('Title: Exploring Transfer Learning\n\nMore text...')).toBe(
        'Exploring Transfer Learning'
      );
    });

    it('extracts the subject when the "Title:" line is the entire content', () => {
      expect(extractEmbeddedTitle('Title: Exploring Transfer Learning')).toBe(
        'Exploring Transfer Learning'
      );
    });

    it('returns null for non-string content', () => {
      expect(extractEmbeddedTitle(null)).toBeNull();
      expect(extractEmbeddedTitle(undefined)).toBeNull();
    });
  });

  describe('isTitleContentMismatch', () => {
    it('is false when content has no "Title:" line at all', () => {
      expect(isTitleContentMismatch('Getting Started with ML', 'Just some content.')).toBe(false);
    });

    it('is false when the embedded title matches the post title', () => {
      expect(
        isTitleContentMismatch(
          'Getting Started with ML',
          'Title: Getting Started with ML\n\nWhat resources should I use?'
        )
      ).toBe(false);
    });

    it('ignores case and surrounding whitespace when comparing', () => {
      expect(
        isTitleContentMismatch(
          '  Getting Started with ML  ',
          'Title: getting started with ml\n\nWhat resources should I use?'
        )
      ).toBe(false);
    });

    it('is true when the embedded title names a different subject', () => {
      expect(
        isTitleContentMismatch(
          'Implementing Efficient Attention Mechanisms in Transformers',
          'Title: Exploring Transfer Learning in Deep Learning Models\n\nTransfer learning...'
        )
      ).toBe(true);
    });
  });
});
