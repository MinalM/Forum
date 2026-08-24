const { hasPersonalizationSignal, roleWordSet, scorePost } = require('../utils/feedRanking');

// Feed values for GET /api/posts — see parseSinceWindow for the `since` format.
const POST_FEED_VALUES = ['recent', 'unanswered', 'top'];
const DEFAULT_TOP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// How many of the most recent matching posts get considered for
// personalized ranking (see BACKLOG.md item 11 / server/utils/feedRanking.js).
// Bounded rather than scoring every matching post so a large forum doesn't
// pay for a full collection scan+score on every "For you" request; a page
// past this pool falls back to whatever recency order the pool already has.
const PERSONALIZATION_CANDIDATE_POOL = 200;

// Parses a `since` window like '7d', '12h', '2w' into milliseconds.
// Returns null for anything else so the caller can fall back to a default.
function parseSinceWindow(since) {
  if (typeof since !== 'string') return null;
  const match = since.match(/^(\d+)(h|d|w)$/);
  if (!match) return null;

  const amount = parseInt(match[1], 10);
  const msPerUnit = { h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000 };
  return amount * msPerUnit[match[2]];
}

const advancedResults = (model, populate) => async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit', 'search', 'feed', 'since'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  const baseFilter = JSON.parse(queryStr);

  // Feed filtering, `GET /api/posts` only — recent (default) / unanswered / top.
  // An unrecognised feed value falls back to 'recent' rather than erroring.
  const isPostModel = model.modelName === 'Post';
  let feedFilter = null;
  let feedSort = null;

  if (isPostModel && req.query.feed !== undefined) {
    const feed = POST_FEED_VALUES.includes(req.query.feed) ? req.query.feed : 'recent';

    if (feed === 'unanswered') {
      feedFilter = { commentCount: 0 };
      feedSort = 'createdAt';
    } else if (feed === 'top') {
      const windowMs = parseSinceWindow(req.query.since) ?? DEFAULT_TOP_WINDOW_MS;
      feedFilter = { createdAt: { $gte: new Date(Date.now() - windowMs) } };
      feedSort = '-score';
    }
  }

  const combinedFilter = feedFilter ? { $and: [baseFilter, feedFilter] } : baseFilter;

  // Personalize the default/recent feed for a signed-in member with a
  // profile to rank against (req.user is only ever set here by
  // optionalAuth — see routes/posts.js). Left off for every other feed,
  // an explicit sort/select (which the ranked path below doesn't honour),
  // or a search (whose own regex relevance takes priority).
  const wantsRecentFeed = req.query.feed === undefined || req.query.feed === 'recent';
  const personalize =
    isPostModel &&
    wantsRecentFeed &&
    !req.query.sort &&
    !req.query.select &&
    !req.query.search &&
    hasPersonalizationSignal(req.user);

  // Finding resource
  query = model.find(combinedFilter);

  // Handle search functionality
  if (req.query.search) {
    const searchQuery = req.query.search;
    const searchRegex = new RegExp(searchQuery, 'i');

    // Determine which fields to search based on model
    let searchFields = [];

    // Detect model by checking if collection name exists
    if (model.collection && model.collection.name) {
      switch (model.collection.name) {
        case 'users':
          searchFields = ['name', 'email'];
          break;
        case 'posts':
          searchFields = ['title', 'content'];
          break;
        case 'comments':
          searchFields = ['content'];
          break;
        case 'categories':
          searchFields = ['name', 'description'];
          break;
        default:
          searchFields = ['name']; // Default search by name
      }
    }

    // Build search conditions
    const searchConditions = searchFields.map(field => ({
      [field]: { $regex: searchRegex }
    }));

    // Clear previous query and apply search condition
    query = model.find({
      $and: [
        combinedFilter, // Original query conditions (incl. feed filter)
        { $or: searchConditions } // Search conditions
      ]
    });
  }

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else if (feedSort) {
    query = query.sort(feedSort);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  // Count documents with the same query parameters (including search)
  let countQuery = {};
  if (req.query.search) {
    const searchQuery = req.query.search;
    const searchRegex = new RegExp(searchQuery, 'i');
    
    // Use the same search fields as before
    let searchFields = [];
    if (model.collection && model.collection.name) {
      switch (model.collection.name) {
        case 'users':
          searchFields = ['name', 'email'];
          break;
        case 'posts':
          searchFields = ['title', 'content'];
          break;
        case 'comments':
          searchFields = ['content'];
          break;
        case 'categories':
          searchFields = ['name', 'description'];
          break;
        default:
          searchFields = ['name'];
      }
    }
    
    const searchConditions = searchFields.map(field => ({
      [field]: { $regex: searchRegex }
    }));
    
    countQuery = {
      $and: [
        combinedFilter,
        { $or: searchConditions }
      ]
    };
  } else {
    countQuery = combinedFilter;
  }

  const total = await model.countDocuments(countQuery);
  const unansweredCount = isPostModel
    ? await model.countDocuments({ commentCount: 0 })
    : undefined;

  let results;

  if (personalize) {
    const roleWords = roleWordSet(req.user.targetRole);
    const candidates = await model
      .find(combinedFilter)
      .select('tags aiMlLevel category createdAt')
      .populate('category', 'name')
      .sort('-createdAt')
      .limit(PERSONALIZATION_CANDIDATE_POOL)
      .lean();

    // Array.prototype.sort is stable, so posts with an equal (including
    // zero) score keep the -createdAt order they were fetched in above.
    const rankedIds = candidates
      .map(candidate => ({ id: candidate._id, score: scorePost(candidate, req.user, roleWords) }))
      .sort((a, b) => b.score - a.score)
      .slice(startIndex, endIndex)
      .map(entry => entry.id);

    let rankedQuery = model.find({ _id: { $in: rankedIds } });
    if (populate) {
      rankedQuery = rankedQuery.populate(populate);
    }
    const rankedDocs = await rankedQuery;

    // $in doesn't preserve order - reassemble in ranked order.
    const docsById = new Map(rankedDocs.map(doc => [doc._id.toString(), doc]));
    results = rankedIds.map(id => docsById.get(id.toString())).filter(Boolean);
  } else {
    query = query.skip(startIndex).limit(limit);

    if (populate) {
      query = query.populate(populate);
    }

    results = await query;
  }

  // Pagination result
  const pagination = {};

  pagination.total = total;
  pagination.limit = limit;
  pagination.page = page;
  pagination.pages = Math.ceil(total / limit);

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.advancedResults = {
    success: true,
    count: results.length,
    pagination,
    data: results
  };

  if (isPostModel) {
    res.advancedResults.unansweredCount = unansweredCount;
  }

  next();
};

module.exports = advancedResults;
