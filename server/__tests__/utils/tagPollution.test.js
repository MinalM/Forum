const { buildPollutionSet, removePollutedTags } = require('../../utils/tagPollution');

// The five real categories (from server/seeder.js) whose name/description
// text generated the live tag pollution described in BACKLOG.md.
const CATEGORIES = [
  {
    name: 'Machine Learning Fundamentals',
    description: 'Discussions about core machine learning concepts, algorithms, and techniques'
  },
  {
    name: 'Deep Learning',
    description: 'Topics related to neural networks, deep learning frameworks, and applications'
  },
  {
    name: 'Career Advice',
    description: 'Guidance on transitioning to AI/ML roles, job hunting, and career development'
  },
  {
    name: 'Learning Resources',
    description: 'Recommendations for courses, books, tutorials, and other learning materials'
  },
  {
    name: 'Project Showcase',
    description: 'Share and discuss your AI/ML projects and portfolios'
  }
];

describe('tagPollution', () => {
  const poisonSet = buildPollutionSet(CATEGORIES);

  describe('removePollutedTags', () => {
    it('drops a full category name+description-fragment tag, regardless of internal spacing', () => {
      expect(
        removePollutedTags(['deep learning topics related to neural networks'], poisonSet)
      ).toEqual([]);
      expect(
        removePollutedTags(['deep learning  topics related to neural networks'], poisonSet)
      ).toEqual([]);
    });

    it('drops a category name+description tag with no comma to split on', () => {
      const tags = ['project showcase  share and discuss your ai/ml projects and portfolios'];
      expect(removePollutedTags(tags, poisonSet)).toEqual([]);
    });

    it('drops the merged name+description tag observed for a third category', () => {
      const tags = [
        'machine learning fundamentals  discussions about core machine learning concepts'
      ];
      expect(removePollutedTags(tags, poisonSet)).toEqual([]);
    });

    it('drops standalone comma-split description fragments', () => {
      const tags = [
        'learning resources  recommendations for courses',
        'books',
        'tutorials',
        'and other learning materials'
      ];
      expect(removePollutedTags(tags, poisonSet)).toEqual([]);
    });

    it('drops fragments from a different category and the fixed junk tokens', () => {
      const tags = ['deep learning frameworks', 'and applications', 'algorithms', 'and techniques', 'discussion', 'help'];
      expect(removePollutedTags(tags, poisonSet)).toEqual([]);
    });

    it('drops a bare "and ..." fragment even if its exact wording is not in the pollution set', () => {
      const tags = ['and some future description fragment'];
      expect(removePollutedTags(tags, poisonSet)).toEqual([]);
    });

    it('preserves genuine tags used by the real seed scripts', () => {
      const tags = ['beginner', 'resources', 'machine learning', 'career transition', 'machine learning engineer', 'pytorch', 'tensorflow', 'nlp', 'llm'];
      expect(removePollutedTags(tags, poisonSet)).toEqual(tags);
    });

    it('is case- and whitespace-insensitive when matching pollution', () => {
      const tags = ['  Discussion ', 'HELP', ' Algorithms '];
      expect(removePollutedTags(tags, poisonSet)).toEqual([]);
    });

    it('drops non-string and empty entries', () => {
      const tags = ['pytorch', '', '   ', null, 42];
      expect(removePollutedTags(tags, poisonSet)).toEqual(['pytorch']);
    });

    it('returns non-array input unchanged', () => {
      expect(removePollutedTags(undefined, poisonSet)).toBeUndefined();
    });
  });

  describe('buildPollutionSet', () => {
    it('ignores categories missing both name and description', () => {
      const set = buildPollutionSet([{}, { name: '', description: '' }]);
      expect(set.has('discussion')).toBe(true);
      expect(set.has('help')).toBe(true);
      expect(set.size).toBe(2);
    });

    it('tolerates an empty or missing category list', () => {
      expect(buildPollutionSet([]).size).toBe(2);
      expect(buildPollutionSet(undefined).size).toBe(2);
    });
  });
});
