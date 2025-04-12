const express = require('express');
const {
  getReports,
  getReport,
  createReport,
  resolveReport,
  dismissReport,
  getPendingReportsCount
} = require('../controllers/reports');

const router = express.Router();

const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Report routes
router.route('/')
  .get(getReports)
  .post(createReport);

router.route('/pending/count')
  .get(getPendingReportsCount);

router.route('/:id')
  .get(getReport);

router.route('/:id/resolve')
  .put(resolveReport);

router.route('/:id/dismiss')
  .put(dismissReport);

module.exports = router;