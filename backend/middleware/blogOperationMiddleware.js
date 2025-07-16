const blogOperationMiddleware = (req, res, next) => {
  const { role, subscription } = req.user;

  if (role === 'admin' || role === 'author') {
    return next();
  }

  if (subscription && subscription.plan === 'pro' && subscription.status === 'active') {
    return next();
  }

  return res.status(403).json({ 
    message: "Access Denied. You need to be an author, admin, or have an active Pro subscription to perform blog operations." 
  });
};

module.exports = blogOperationMiddleware;
