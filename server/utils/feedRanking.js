// "For you" relevance ranking (see BACKLOG.md item 11) - a small,
// documented weighted score, not a learned model, matching a member's
// profile (User.targetRole / User.skills / User.aiMlExperience) against a
// post's category / tags / aiMlLevel.
//
//   relevanceScore = TAG_WEIGHT      * (matching tags)
//                   + LEVEL_WEIGHT   * (1 if the post's aiMlLevel fits the
//                                       member's aiMlExperience, else 0)
//                   + CATEGORY_WEIGHT * (1 if the post's category shares a
//                                        word with the member's targetRole,
//                                        else 0)
//
// Ties (including an all-zero score) fall back to recency - callers are
// expected to fetch candidates newest-first before scoring and use a
// stable sort, so unscored/tied posts keep their recency order.
const TAG_WEIGHT = 3;
const LEVEL_WEIGHT = 2;
const CATEGORY_WEIGHT = 2;

// A member only gets a personalized ranking once they've told us something
// to personalize with - onboarding lets you skip both skills and role, and
// aiMlExperience always carries a default, so it alone never counts.
function hasPersonalizationSignal(user) {
  if (!user) return false;
  const hasSkills = Array.isArray(user.skills) && user.skills.length > 0;
  const hasTargetRole = typeof user.targetRole === 'string' && user.targetRole.trim().length > 0;
  return hasSkills || hasTargetRole;
}

// Splits a free-text role ("Machine Learning Engineer", "MLOps / Platform")
// into a lowercase word set for a simple category-name overlap check.
// Single-letter words are dropped as too generic to mean anything ("a", "I").
function roleWordSet(targetRole) {
  if (typeof targetRole !== 'string') return new Set();
  const words = targetRole
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word.length > 1);
  return new Set(words);
}

function countMatchingTags(postTags, userSkills) {
  if (!Array.isArray(postTags) || !Array.isArray(userSkills) || userSkills.length === 0) {
    return 0;
  }
  const skillSet = new Set(userSkills.map(skill => String(skill).toLowerCase()));
  return postTags.filter(tag => skillSet.has(String(tag).toLowerCase())).length;
}

function levelMatches(aiMlLevel, aiMlExperience) {
  if (!aiMlLevel) return false;
  return aiMlLevel === 'all' || aiMlLevel === aiMlExperience;
}

function categoryMatches(categoryName, roleWords) {
  if (!categoryName || !roleWords || roleWords.size === 0) return false;
  const categoryWords = String(categoryName)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return categoryWords.some(word => roleWords.has(word));
}

// `post` needs `tags`, `aiMlLevel`, and `category` (either populated with a
// `name`, or already a plain name string). `roleWords` is precomputed once
// per request via roleWordSet() and passed in to avoid re-splitting the
// member's targetRole for every candidate post.
function scorePost(post, user, roleWords) {
  const categoryName = post.category && typeof post.category === 'object'
    ? post.category.name
    : post.category;

  const tagScore = countMatchingTags(post.tags, user.skills) * TAG_WEIGHT;
  const levelScore = levelMatches(post.aiMlLevel, user.aiMlExperience) ? LEVEL_WEIGHT : 0;
  const categoryScore = categoryMatches(categoryName, roleWords) ? CATEGORY_WEIGHT : 0;

  return tagScore + levelScore + categoryScore;
}

module.exports = {
  TAG_WEIGHT,
  LEVEL_WEIGHT,
  CATEGORY_WEIGHT,
  hasPersonalizationSignal,
  roleWordSet,
  scorePost
};
