const ErrorResponse = require('../utils/errorResponse');

/**
 * Role-based permission middleware
 */

// Check if user has sufficient permission to perform an action on a resource
exports.checkPermission = (action) => {
  return async (req, res, next) => {
    const { user } = req;
    if (!user) {
      return next(new ErrorResponse('User not authenticated', 401));
    }

    const userRole = user.role;
    let hasPermission = false;

    switch (action) {
      // Post operations
      case 'createPost':
        // All authenticated users can create posts
        hasPermission = true;
        break;
      case 'editPost':
        // Users can edit their own posts, moderators and admins can edit any post
        hasPermission = 
          req.params.id && 
          (user._id.toString() === req.body.user.toString() || 
          ['admin', 'moderator'].includes(userRole));
        break;
      case 'deletePost':
        // Users can delete their own posts, moderators and admins can delete any post
        hasPermission = 
          req.params.id && 
          (user._id.toString() === req.body.user.toString() || 
          ['admin', 'moderator'].includes(userRole));
        break;
      case 'pinPost':
      case 'lockThread':
      case 'moveThread':
        // Only moderators and admins can pin posts or lock threads
        hasPermission = ['admin', 'moderator'].includes(userRole);
        break;
        
      // Comment operations
      case 'createComment':
        // All authenticated users can create comments
        hasPermission = true;
        break;
      case 'editComment':
        // Users can edit their own comments, moderators and admins can edit any comment
        hasPermission = 
          req.params.id && 
          (user._id.toString() === req.body.user.toString() || 
          ['admin', 'moderator'].includes(userRole));
        break;
      case 'deleteComment':
        // Users can delete their own comments, moderators and admins can delete any comment
        hasPermission = 
          req.params.id && 
          (user._id.toString() === req.body.user.toString() || 
          ['admin', 'moderator'].includes(userRole));
        break;
        
      // Category operations
      case 'createCategory':
      case 'editCategory':
      case 'deleteCategory':
        // Only admins can manage categories
        hasPermission = userRole === 'admin';
        break;
        
      // User management
      case 'manageUserRoles':
      case 'banUser':
        // Only admins can manage user roles and ban users
        hasPermission = userRole === 'admin';
        break;
      case 'timeoutUser':
        // Moderators and admins can apply timeouts
        hasPermission = ['admin', 'moderator'].includes(userRole);
        break;
        
      // Reporting system
      case 'resolveReport':
        // Moderators and admins can resolve reports
        hasPermission = ['admin', 'moderator'].includes(userRole);
        break;

      // Default deny if not explicitly allowed
      default:
        hasPermission = false;
    }

    if (hasPermission) {
      next();
    } else {
      return next(
        new ErrorResponse(
          'You do not have permission to perform this action',
          403
        )
      );
    }
  };
};