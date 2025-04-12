const hasPermission = (user, permission) => {
  if (!user) return false;
  
  // Define permission mappings
  const permissions = {
    // Post-related permissions
    createPost: ['user', 'moderator', 'admin'],
    editPost: ['user', 'moderator', 'admin'], // User can edit own posts only
    deletePost: ['user', 'moderator', 'admin'], // User can delete own posts only
    pinPost: ['moderator', 'admin'],
    lockThread: ['moderator', 'admin'],
    moveThread: ['moderator', 'admin'],
    
    // Comment-related permissions
    createComment: ['user', 'moderator', 'admin'],
    editComment: ['user', 'moderator', 'admin'], // User can edit own comments only
    deleteComment: ['user', 'moderator', 'admin'], // User can delete own comments only
    
    // Admin features
    manageUsers: ['admin'],
    manageCategories: ['admin'],
    manageUserRoles: ['admin'],
    banUser: ['admin'],
    
    // Moderation features
    timeoutUser: ['moderator', 'admin'],
    viewReports: ['moderator', 'admin'],
    resolveReports: ['moderator', 'admin'],
    
    // Reporting
    createReport: ['user', 'moderator', 'admin'],
    
    // Access to dashboards
    accessAdminDashboard: ['admin'],
    accessModeratorDashboard: ['moderator', 'admin']
  };
  
  return permissions[permission]?.includes(user.role) || false;
};

// Check if a user is the owner of a resource
const isOwner = (user, resource) => {
  if (!user || !resource) return false;
  return user._id === resource.user || user._id === resource.user._id;
};

// Check if user has permission to edit/delete a post or comment
const canModifyResource = (user, resource) => {
  if (!user || !resource) return false;
  
  // Admins and moderators can modify any resource
  if (['admin', 'moderator'].includes(user.role)) return true;
  
  // Regular users can only modify their own resources
  return isOwner(user, resource);
};

export { hasPermission, isOwner, canModifyResource };