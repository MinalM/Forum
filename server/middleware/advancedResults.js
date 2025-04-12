const advancedResults = (model, populate) => async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ['select', 'sort', 'page', 'limit', 'search'];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach(param => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

  // Finding resource
  query = model.find(JSON.parse(queryStr));

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
        JSON.parse(queryStr), // Original query conditions
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
        JSON.parse(queryStr),
        { $or: searchConditions }
      ]
    };
  } else {
    countQuery = JSON.parse(queryStr);
  }
  
  const total = await model.countDocuments(countQuery);

  query = query.skip(startIndex).limit(limit);

  if (populate) {
    query = query.populate(populate);
  }

  // Executing query
  const results = await query;

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

  next();
};

module.exports = advancedResults;
