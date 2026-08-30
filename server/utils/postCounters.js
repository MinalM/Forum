const Comment = require('../models/Comment');

// Whether a post has no comments should be resolved against the Comment
// collection directly, not the denormalised `Post.commentCount` field.
// `commentCount` is kept in sync going forward by the comment/vote
// controllers (BACKLOG.md item 1's denormalisation), but posts written
// straight into MongoDB — scripts/seed-mongo.js and scripts/generate-seed.js
// insert raw documents via the driver's `insertMany`, bypassing the Post
// model entirely — never got the field's schema default applied. It's
// simply absent from the stored document, not literally 0. Mongoose still
// *displays* it as 0 once such a document is hydrated for a GET response
// (schema defaults apply on read too), which is why the API's JSON shows
// `"commentCount":0` for these posts, but `Model.find({ commentCount: 0 })`
// is a raw MongoDB match that only finds an explicit 0 and silently skips
// documents missing the field. The reverse failure mode matters just as
// much: a post whose stored `commentCount` is stale (missing, or simply
// wrong) but genuinely has comments must not be reported as unanswered
// either — trusting the cached field either way, in either direction, is
// wrong. Both only go away by checking the source of truth.
//
// Returns the `_id`s of every post matching `matchFilter` that has zero
// comments, oldest first (the `unanswered` feed's sort — the oldest
// unanswered question is the one most at risk of never being answered).
async function findUnansweredPostIds(Post, matchFilter = {}) {
  const rows = await Post.aggregate([
    { $match: matchFilter },
    {
      $lookup: {
        from: Comment.collection.name,
        localField: '_id',
        foreignField: 'post',
        pipeline: [{ $limit: 1 }, { $project: { _id: 1 } }],
        as: '_comments'
      }
    },
    { $match: { _comments: { $size: 0 } } },
    { $sort: { createdAt: 1 } },
    { $project: { _id: 1 } }
  ]);

  return rows.map(row => row._id);
}

module.exports = { findUnansweredPostIds };
