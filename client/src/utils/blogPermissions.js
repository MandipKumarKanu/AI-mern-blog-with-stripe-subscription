// Utility function to check if a user can create/manage blogs
export const canCreateBlogs = (user) => {
  if (!user) return false;
  
  // Admins and authors always can create blogs
  if (user.role === 'admin' || user.role === 'author') {
    return true;
  }
  
  // Pro users with active subscription can create blogs
  if (user.subscription?.plan === 'pro' && user.subscription?.status === 'active') {
    return true;
  }
  
  return false;
};

// Utility function to check if a user can edit/delete a specific blog
export const canEditBlog = (user, blog) => {
  if (!user || !blog) return false;
  
  // Admins can edit any blog
  if (user.role === 'admin') {
    return true;
  }
  
  // Authors and Pro users can edit their own blogs
  if ((user.role === 'author' || (user.subscription?.plan === 'pro' && user.subscription?.status === 'active')) 
      && blog.author?._id === user.id) {
    return true;
  }
  
  return false;
};
