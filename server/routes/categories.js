const express = require('express');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getAiMlCategories
} = require('../controllers/categories');

// Include other resource routers
const postRouter = require('./posts');

const Category = require('../models/Category');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');

// Re-route into other resource routers
router.use('/:categoryId/posts', postRouter);

// Special routes
router.get('/aiml', getAiMlCategories);

router
  .route('/')
  .get(advancedResults(Category), getCategories)
  .post(protect, authorize('admin'), createCategory);

router
  .route('/:id')
  .get(getCategory)
  .put(protect, authorize('admin'), updateCategory)
  .delete(protect, authorize('admin'), deleteCategory);

module.exports = router;
