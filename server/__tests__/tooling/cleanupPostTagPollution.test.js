const { cleanTags } = require('../../../scripts/cleanup-post-tag-pollution');
const { buildPollutionSet } = require('../../utils/tagPollution');
const { MAX_TAG_LENGTH, MAX_TAGS } = require('../../utils/normalizeTags');

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

// The real live, polluted tag arrays quoted in BACKLOG.md.
const LIVE_POLLUTED_EXAMPLES = [
  ['deep learning topics related to neural networks', 'deep learning frameworks', 'and applications', 'discussion', 'help'],
  ['project showcase  share and discuss your ai/ml projects and portfolios', 'discussion', 'help'],
  ['machine learning fundamentals  discussions about core machine learning concepts', 'algorithms', 'and techniques', 'discussion', 'help'],
  ['learning resources  recommendations for courses', 'books', 'tutorials', 'and other learning materials', 'discussion', 'help']
];

describe('scripts/cleanup-post-tag-pollution', () => {
  const pollutionSet = buildPollutionSet(CATEGORIES);

  describe('cleanTags', () => {
    it.each(LIVE_POLLUTED_EXAMPLES)('strips every polluted tag from a real live example: %j', (tags) => {
      const result = cleanTags(tags, pollutionSet);

      expect(result).toEqual([]);
    });

    it('contains no multi-word category-description phrase, "and ..." fragment, or discussion/help junk across all examples', () => {
      const results = LIVE_POLLUTED_EXAMPLES.map((tags) => cleanTags(tags, pollutionSet)).flat();

      for (const tag of results) {
        expect(tag.toLowerCase()).not.toMatch(/^and\s+/);
        expect(tag.toLowerCase()).not.toBe('discussion');
        expect(tag.toLowerCase()).not.toBe('help');
      }
      expect(results).toEqual([]);
    });

    it('preserves genuine short tags mixed in with pollution', () => {
      const tags = ['pytorch', 'deep learning frameworks', 'nlp', 'and applications', 'beginner'];

      expect(cleanTags(tags, pollutionSet)).toEqual(['pytorch', 'nlp', 'beginner']);
    });

    it('still applies the existing MAX_TAG_LENGTH cap from cleanup-post-tags.js', () => {
      const overLong = 'x'.repeat(MAX_TAG_LENGTH + 1);
      const tags = ['pytorch', overLong];

      expect(cleanTags(tags, pollutionSet)).toEqual(['pytorch']);
    });

    it('still applies the existing MAX_TAGS cap from cleanup-post-tags.js', () => {
      const tags = Array.from({ length: MAX_TAGS + 5 }, (_, i) => `tag${i}`);

      expect(cleanTags(tags, pollutionSet)).toHaveLength(MAX_TAGS);
    });

    it('leaves an already-clean tag list untouched', () => {
      const tags = ['beginner', 'resources', 'machine learning'];

      expect(cleanTags(tags, pollutionSet)).toEqual(tags);
    });
  });
});
