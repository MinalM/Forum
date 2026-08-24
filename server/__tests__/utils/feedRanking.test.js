const {
  hasPersonalizationSignal,
  roleWordSet,
  scorePost,
  TAG_WEIGHT,
  LEVEL_WEIGHT,
  CATEGORY_WEIGHT
} = require('../../utils/feedRanking');

describe('feedRanking', () => {
  describe('hasPersonalizationSignal', () => {
    it('is false with no user', () => {
      expect(hasPersonalizationSignal(null)).toBe(false);
      expect(hasPersonalizationSignal(undefined)).toBe(false);
    });

    it('is false for a cold-start member with no skills or targetRole', () => {
      expect(hasPersonalizationSignal({ skills: [], targetRole: '', aiMlExperience: 'beginner' })).toBe(false);
      expect(hasPersonalizationSignal({ aiMlExperience: 'beginner' })).toBe(false);
    });

    it('is true when skills are set', () => {
      expect(hasPersonalizationSignal({ skills: ['python'] })).toBe(true);
    });

    it('is true when targetRole is set, even with no skills', () => {
      expect(hasPersonalizationSignal({ skills: [], targetRole: 'Data Scientist' })).toBe(true);
    });

    it('ignores a whitespace-only targetRole', () => {
      expect(hasPersonalizationSignal({ skills: [], targetRole: '   ' })).toBe(false);
    });
  });

  describe('roleWordSet', () => {
    it('lowercases and splits on non-alphanumeric characters', () => {
      expect(roleWordSet('MLOps / Platform')).toEqual(new Set(['mlops', 'platform']));
    });

    it('drops single-letter words', () => {
      expect(roleWordSet('A B Data Scientist')).toEqual(new Set(['data', 'scientist']));
    });

    it('returns an empty set for a non-string role', () => {
      expect(roleWordSet(undefined)).toEqual(new Set());
    });
  });

  describe('scorePost', () => {
    const roleWords = roleWordSet('Machine Learning Engineer');

    it('adds TAG_WEIGHT per matching tag, case-insensitively', () => {
      const post = { tags: ['Python', 'PyTorch', 'sql'], aiMlLevel: 'beginner', category: { name: 'Unrelated' } };
      const user = { skills: ['python', 'pytorch'], aiMlExperience: 'advanced' };

      expect(scorePost(post, user, roleWordSet(''))).toBe(2 * TAG_WEIGHT);
    });

    it('adds LEVEL_WEIGHT when aiMlLevel matches the member experience', () => {
      const post = { tags: [], aiMlLevel: 'advanced', category: { name: 'Unrelated' } };
      const user = { skills: [], aiMlExperience: 'advanced' };

      expect(scorePost(post, user, roleWordSet(''))).toBe(LEVEL_WEIGHT);
    });

    it('adds LEVEL_WEIGHT when the post is level "all"', () => {
      const post = { tags: [], aiMlLevel: 'all', category: { name: 'Unrelated' } };
      const user = { skills: [], aiMlExperience: 'beginner' };

      expect(scorePost(post, user, roleWordSet(''))).toBe(LEVEL_WEIGHT);
    });

    it('adds CATEGORY_WEIGHT when the category shares a word with targetRole', () => {
      const post = { tags: [], aiMlLevel: 'expert', category: { name: 'Machine Learning Fundamentals' } };
      const user = { skills: [], aiMlExperience: 'beginner' };

      expect(scorePost(post, user, roleWords)).toBe(CATEGORY_WEIGHT);
    });

    it('accepts a plain category name string, not just a populated object', () => {
      const post = { tags: [], aiMlLevel: 'expert', category: 'Machine Learning Fundamentals' };
      const user = { skills: [], aiMlExperience: 'beginner' };

      expect(scorePost(post, user, roleWords)).toBe(CATEGORY_WEIGHT);
    });

    it('sums every matching dimension', () => {
      const post = {
        tags: ['python', 'pytorch'],
        aiMlLevel: 'advanced',
        category: { name: 'Machine Learning Fundamentals' }
      };
      const user = { skills: ['python', 'pytorch'], aiMlExperience: 'advanced' };

      expect(scorePost(post, user, roleWords)).toBe(2 * TAG_WEIGHT + LEVEL_WEIGHT + CATEGORY_WEIGHT);
    });

    it('scores 0 when nothing matches', () => {
      const post = { tags: ['sql'], aiMlLevel: 'beginner', category: { name: 'Career Advice' } };
      const user = { skills: ['python'], aiMlExperience: 'advanced' };

      expect(scorePost(post, user, roleWords)).toBe(0);
    });
  });
});
