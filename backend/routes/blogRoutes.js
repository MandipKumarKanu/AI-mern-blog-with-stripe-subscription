const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createBlog,
  getAllBlogs,
  getBlogById,
  getBlogsByUserId,
  deleteBlog,
  updateBlog,
  searchBlogs,
  getByCategory,
  blogLikes,
  approveBlog,
  rejectBlog,
  getAllUnApprovedBlogs,
  getLatestBlogsByViews,
  incrementViews,
  getPopularBlog,
  summarizeBlog,
  incrementShares,
  getBlogsByCategoryPage,
  getPopularBlogsOfMonth,
  getRecommendedBlogs,
  searchBlogByQuery,
  getAllBlogsForAdmin,
  getContentBasedRecommendations,
} = require("../controllers/blogController");
const roleMiddleware = require("../middleware/roleMiddleware");
const userMiddleware = require("../middleware/userMiddleware");
const blogCreationMiddleware = require("../middleware/blogCreationMiddleware");
const blogOperationMiddleware = require("../middleware/blogOperationMiddleware");
const router = express.Router();

router.post("/recommended/:id", userMiddleware, getRecommendedBlogs);
router.post(
  "/",
  authMiddleware,
  blogCreationMiddleware,
  createBlog
);
router.get("/", getAllBlogs);
router.get("/summarize/:id",userMiddleware, summarizeBlog);
router.get("/popular", getPopularBlog);
router.get("/search", searchBlogs);
router.get("/searchByQuery", searchBlogByQuery);
router.post(
  "/recommendation-content",
  userMiddleware,
  getContentBasedRecommendations
);
router.get("/filter", getByCategory);
router.get(
  "/admin",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAllBlogsForAdmin
);
router.get("/popularmonth", getPopularBlogsOfMonth);
router.get(
  "/unapproved",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAllUnApprovedBlogs
);
router.get("/:id", getBlogById);
router.delete(
  "/:id",
  authMiddleware,
  blogOperationMiddleware,
  deleteBlog
);
router.patch(
  "/:id",
  authMiddleware,
  blogOperationMiddleware,
  updateBlog
);
router.get("/author/:authorId", getBlogsByUserId);
router.post("/like/:id", authMiddleware, blogLikes);
router.patch(
  "/:id/approve",
  authMiddleware,
  roleMiddleware(["admin"]),
  approveBlog
);
router.patch(
  "/:id/reject",
  authMiddleware,
  roleMiddleware(["admin"]),
  rejectBlog
);
router.get("/popular/views", getLatestBlogsByViews);
router.patch("/views/:id", incrementViews);
router.patch("/shares/:id", incrementShares);
router.post("/by-categories", getBlogsByCategoryPage);

module.exports = router;
