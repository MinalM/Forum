// Detects and strips the category-name/description-fragment tag pollution
// described in BACKLOG.md ("Every live post shows category-name/description
// fragments..."). The polluting rows were built from the actual Category
// text — a category's full name/description, plus its description
// comma-split into fragments, all lowercased — stored on posts as tags. That
// makes matching against the real, current Category collection far more
// precise than a heuristic (word count, length) could be: #33's length cap
// already proved too broad a heuristic here misses short fragments like
// "algorithms" while a stricter one would also reject genuine multi-word
// tags like "machine learning engineer".
//
// This intentionally does not replace `normalizeTags`/`MAX_TAG_LENGTH`/
// `MAX_TAGS` from `./normalizeTags` — callers combine both.

const CONNECTOR_FRAGMENT = /^and\s+/i;
// Fixed junk tokens observed on every polluted post, not tied to any single
// category's text.
const FIXED_JUNK_TAGS = new Set(['discussion', 'help']);

// Trims, lowercases, and collapses internal whitespace runs to a single
// space. The live pollution examples in BACKLOG.md show the
// name+description-fragment tag with inconsistent internal spacing (a
// double space in some, single in others), so both sides of every
// comparison go through this before matching rather than relying on an
// exact separator.
function normalizeWhitespace(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Builds the set of normalized (trimmed, lowercased) strings that are known
// pollution for the given categories: each category's full name, full
// description, every comma-split fragment of its description, and the
// name+first-description-fragment combination the seeding bug concatenated
// together as a single tag.
function buildPollutionSet(categories) {
  const poison = new Set(FIXED_JUNK_TAGS);

  for (const category of categories || []) {
    const name = typeof category?.name === 'string' ? category.name.trim() : '';
    const description =
      typeof category?.description === 'string' ? category.description.trim() : '';

    if (!name && !description) {
      continue;
    }

    if (name) {
      poison.add(normalizeWhitespace(name));
    }
    if (description) {
      poison.add(normalizeWhitespace(description));
    }

    const fragments = description
      .split(',')
      .map((fragment) => normalizeWhitespace(fragment))
      .filter(Boolean);

    fragments.forEach((fragment) => poison.add(fragment));

    if (name && fragments.length > 0) {
      poison.add(normalizeWhitespace(`${name} ${fragments[0]}`));
    }
  }

  return poison;
}

// Given a post's raw tags and a pollution set built from the live Category
// collection, drops any tag that is known pollution (exact match, after
// trim+lowercase) or a bare connector fragment ("and ..."), which survives
// exact matching whenever a description's wording drifts from what
// generated the pollution. Preserves everything else, including short
// genuine tags that happen to also appear in a category's description
// (an accepted, documented trade-off — see BACKLOG.md).
function removePollutedTags(tags, pollutionSet) {
  if (!Array.isArray(tags)) {
    return tags;
  }

  return tags.filter((tag) => {
    if (typeof tag !== 'string') {
      return false;
    }

    const normalized = normalizeWhitespace(tag);
    if (!normalized) {
      return false;
    }

    if (pollutionSet.has(normalized)) {
      return false;
    }

    if (CONNECTOR_FRAGMENT.test(normalized)) {
      return false;
    }

    return true;
  });
}

module.exports = { buildPollutionSet, removePollutedTags };
