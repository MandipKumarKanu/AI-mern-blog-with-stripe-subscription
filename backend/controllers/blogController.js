const Blog = require("../models/Blog");
const mongoose = require("mongoose");
const addCustomClassesToHtml = require("../utils/addCustomClass");
const Notification = require("../models/Notification");
const { updateUserInterests } = require("../utils/helper");
const User = require("../models/User");
const levenshtein = require("fast-levenshtein");

const createBlog = async (req, res) => {
  const { title, content, tags, category, image, scheduledPublishDate } =
    req.body;

  try {
    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: "Tags must be a non-empty array." });
    }
    if (tags.length > 3) {
      return res
        .status(400)
        .json({ error: "You can select a maximum of 3 tags." });
    }

    if (!Array.isArray(category) || category.length === 0) {
      return res
        .status(400)
        .json({ error: "Category must be a non-empty array." });
    }
    if (category.length > 1) {
      return res
        .status(400)
        .json({ error: "You can select a maximum of 1 categories." });
    }

    const styledContent = addCustomClassesToHtml(content);

    const blog = await Blog.create({
      title,
      content: styledContent,
      tags,
      category,
      image,
      author: req.user.id,
      scheduledPublishDate: scheduledPublishDate || null,
      scheduled: !!scheduledPublishDate,
      status: scheduledPublishDate ? "scheduled" : "published",
      publishedAt: scheduledPublishDate
        ? new Date(scheduledPublishDate)
        : new Date(),
    });

    res.status(201).json({
      message: `Blog ${
        scheduledPublishDate ? "scheduled" : "published"
      } successfully`,
      blog,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAllBlogs = async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const blogs = await Blog.find({ status: "published" })
      .populate("author", "name userName email profileImage subscription")
      .populate("category", "name")
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBlogs = await Blog.countDocuments({ status: "published" });
    const totalPages = Math.ceil(totalBlogs / limit);

    if (blogs.length === 0) {
      return res.status(400).json({ error: "No blogs found" });
    }

    res.status(200).json({ blogs, totalPages, currentPage: page });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getAllUnApprovedBlogs = async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const blogs = await Blog.find({ status: "pending" })
      .populate("author", "name userName email profileImage subscription")
      .populate("likes", "name profileImage")
      .populate("category", "name")
      .skip(skip)
      .limit(limit);

    const totalBlogs = await Blog.countDocuments({ status: "pending" });
    const totalPages = Math.ceil(totalBlogs / limit);

    if (blogs.length === 0) {
      return res.status(400).json({ error: "No blogs found" });
    }

    res.status(200).json({ blogs, totalPages, currentPage: page });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const getBlogById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid blog ID" });
  }

  try {
    const blog = await Blog.findById(id)
      .populate("author", "name userName email profileImage subscription")
      .populate("likes", "name profileImage")
      .populate("comments")
      .populate("category", "name");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({ blog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBlogsByUserId = async (req, res, next) => {
  const { page = 1, limit = null } = req.query;
  const skip = (page - 1) * limit;

  try {
    const blogs = await Blog.find({ author: req.params.authorId })
      .populate("author", "name userName email profileImage subscription")
      .populate("category", "name")
      .skip(skip)
      .limit(limit)
      .sort({ publishedAt: -1 });

    const totalBlogs = await Blog.countDocuments({
      author: req.params.authorId,
    });
    const totalPages = Math.ceil(totalBlogs / limit);

    if (blogs.length === 0) {
      return res.status(400).json({ error: "No blogs found" });
    }

    res.status(200).json({ blogs, totalPages, currentPage: page });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBlog = async (req, res, next) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    if (blog.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this blog" });
    }

    await Blog.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const summarizeBlog = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: "Authentication required", 
        message: "Please login to use AI summary feature" 
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "AI summary service is not configured",
        message: "Please contact support"
      });
    }

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    if (!user.aiUsage) {
      user.aiUsage = {
        month: currentMonth,
        year: currentYear,
        summaryCount: 0
      };
    }

    if (user.aiUsage.month !== currentMonth || user.aiUsage.year !== currentYear) {
      user.aiUsage = {
        month: currentMonth,
        year: currentYear,
        summaryCount: 0
      };
    }

    const subscriptionPlan = user.subscription?.plan || 'free';
    const isActiveSubscription = user.subscription?.status === 'active' && 
                                user.subscription?.endDate > currentDate;

    const limits = {
      free: 5,
      premium: Infinity,
      pro: Infinity
    };

    const currentPlan = user.role === 'admin' ? 'admin' : (isActiveSubscription ? subscriptionPlan : 'free');
    const monthlyLimit = user.role === 'admin' ? Infinity : limits[currentPlan];

    if (user.aiUsage.summaryCount >= monthlyLimit) {
      return res.status(403).json({
        error: "Usage limit exceeded",
        message: `You have reached your monthly limit of ${monthlyLimit} AI summaries. Upgrade to Premium for unlimited access!`,
        usageInfo: {
          used: user.aiUsage.summaryCount,
          limit: monthlyLimit,
          plan: currentPlan
        }
      });
    }

    const prompt = `
    # 🌍 POLYGLOT ESSENCE EXTRACTOR 🧠
    
    You are a master of cross-linguistic content distillation, capable of identifying and extracting the essence from any text, regardless of language.
    
    ## YOUR MISSION 🎯
    
    Transform the provided content into a razor-sharp summary containing the most valuable insights. Your summary must:
    - Be in the EXACT SAME LANGUAGE as the original content
    - Identify a MINIMUM of 5 critical elements
    - Maintain the author's original tone and perspective
    - Preserve all crucial numerical data and statistics
    - Point should be short and easy to understand
    
    ## EXTRACTION TARGETS 🔍
    
    │ 📊 CORE DATA         │ Essential statistics, measurements, and quantifiable information
    │ 💡 KEY INSIGHTS      │ Central arguments and transformative ideas
    │ ⏱️ CRITICAL TIMELINES │ Significant dates, sequences, and chronological elements
    │ 🏆 MAJOR OUTCOMES    │ Results, conclusions, and consequences
    │ 💬 STANDOUT QUOTES   │ Memorable phrases and distinctive perspectives
    
    ## OUTPUT FORMAT ⚙️
    
    Return ONLY a semantic HTML bullet list - no preamble, no commentary:
    
    <ul class="list-disc ml-6 space-y-2 text-muted-foreground">
      <li>Key point 1</li>
      <li>Key point 2</li>
      <!-- Continue with additional key points -->
    </ul>
    
    ## SOURCE MATERIAL with the below langguage i need 📑
    
    ${blog.content}
    `;

    let response;
    let lastError;
    const maxRetries = 3;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
            }),
            timeout: 30000,  
          }
        );

        if (response.ok) {
          break; 
        }

        if (response.status === 503) {
          lastError = new Error(`Gemini API is temporarily unavailable (503). This usually resolves within a few minutes.`);
        } else if (response.status === 429) {
          lastError = new Error(`Gemini API rate limit exceeded (429). Please try again later.`);
        } else if (response.status === 401) {
          lastError = new Error(`Gemini API authentication failed (401). Please check API key configuration.`);
        } else {
          lastError = new Error(`Gemini API error: ${response.status} - ${response.statusText}`);
        }

        if (response.status === 401) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && (error.name === 'TypeError' || error.message.includes('fetch'))) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        }
        break;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error('Failed to connect to Gemini API after multiple attempts');
    }

    const result = await response.json();

    user.aiUsage.summaryCount += 1;
    await user.save();

    res.status(200).json({
      summary: result?.candidates?.[0].content?.parts?.[0].text,
      usageInfo: {
        used: user.aiUsage.summaryCount,
        limit: monthlyLimit,
        plan: currentPlan,
        remaining: monthlyLimit === Infinity ? "unlimited" : monthlyLimit - user.aiUsage.summaryCount
      }
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes('503')) {
      statusCode = 503;
      errorMessage = "AI summary service is temporarily unavailable. Please try again in a few minutes.";
    } else if (error.message.includes('429')) {
      statusCode = 429;
      errorMessage = "Too many requests to AI service. Please wait a moment and try again.";
    } else if (error.message.includes('401')) {
      statusCode = 500; 
      errorMessage = "AI summary service is currently unavailable. Please try again later.";
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      statusCode = 503;
      errorMessage = "Unable to connect to AI summary service. Please check your internet connection and try again.";
    } else if (error.message.includes('timeout')) {
      statusCode = 408;
      errorMessage = "AI summary request timed out. Please try again with a shorter blog post.";
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      retryable: statusCode !== 500,
      supportMessage: statusCode === 500 ? "If this problem persists, please contact support." : null
    });
  }
};

const updateBlog = async (req, res) => {
  const { title, content, image, category, tags, scheduledPublishDate } =
    req.body;
  try {
    const styledContent = addCustomClassesToHtml(content);

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (blog.author.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "You do not have permission to update this blog." });
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: "Tags must be a non-empty array." });
    }
    if (tags.length > 3) {
      return res
        .status(400)
        .json({ error: "You can select a maximum of 3 tags." });
    }

    if (!Array.isArray(category) || category.length === 0) {
      return res
        .status(400)
        .json({ error: "Category must be a non-empty array." });
    }
    if (category.length > 1) {
      return res
        .status(400)
        .json({ error: "You can select a maximum of 1 categories." });
    }

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content: styledContent,
        image,
        category,
        tags,
        scheduledPublishDate,
      },
      { new: true }
    ).populate("author", "name email subscription");

    res
      .status(200)
      .json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    console.error("Error updating blog:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const approveBlog = async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "You must be an admin to approve blogs." });
  }

  const blog = await Blog.findById(req.params.id);

  if (!blog) {
    return res.status(404).json({ message: "Blog not found" });
  }

  const now = new Date();

  if (blog.scheduled) {
    if (now >= blog.scheduledPublishDate) {
      blog.status = "published";
      blog.publishedAt = now;
    } else {
      blog.status = "scheduled";
      blog.publishedAt = null;
    }
  } else {
    blog.status = "published";
    blog.publishedAt = now;
  }

  await blog.save();

  res.status(200).json({ message: "Blog approved successfully", blog });
};

const searchBlogs = async (req, res, next) => {
  const { tags } = req.query;

  if (!tags)
    return res.status(400).json({ error: "Please provide tags for search" });

  const tagsArray = tags.split(",").map((tag) => tag.trim());

  try {
    const blogs = await Blog.find({
      tags: { $in: tagsArray },
      status: "published",
    }) 
      .populate("author", "name profileImage subscription")
      .populate("category", "name");
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).error({ error });
  }
};

const getByCategory = async (req, res, next) => {
  const { category, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  if (!category)
    return res
      .status(400)
      .json({ error: "Please provide category for search" });

  try {
    let blogs, totalBlogs, totalPages;
    if (category === "All") {
      blogs = await Blog.find({ status: "published" })
        .populate("author", "name profileImage subscription")
        .populate("category", "name")
        .populate("comments")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      totalBlogs = await Blog.countDocuments({ status: "published" });
    } else {
      blogs = await Blog.find({ category: category, status: "published" })
        .populate("category", "name")
        .populate("author", "name profileImage subscription")
        .populate("comments")
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
      totalBlogs = await Blog.countDocuments({
        category: category,
        status: "published",
      });
    }
    totalPages = Math.ceil(totalBlogs / limit);

    res.status(200).json({ blogs, totalPages, currentPage: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error });
  }
};

const blogLikes = async (req, res) => {
  try {
    const userId = req.user.id;
    const blog = await Blog.findById(req.params.id);

    // const io = req.app.get("io");

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    if (req.body.status !== undefined) {
      if (req.body.status) {
        await Blog.findByIdAndUpdate(
          req.params.id,
          { $addToSet: { likes: userId } },
          { new: true }
        );

        // const notification = new Notification({
        //   userId: blog.author,
        //   type: "like",
        //   message: `User liked your post!`,
        //   postId: blog._id,
        // });

        // await notification.save();
        // io.to(blog.author.toString()).emit("newNotification", notification);
        updateUserInterests(userId, blog.category);
      } else {
        await Blog.findByIdAndUpdate(
          req.params.id,
          { $pull: { likes: userId } },
          { new: true }
        );
      }
    }

    const updatedBlog = await Blog.findById(req.params.id);
    const isLiked = updatedBlog.likes.includes(userId);

    res.status(200).json({
      isLiked,
      likesCount: updatedBlog.likes.length,
    });
  } catch (error) {
    console.error("Error handling blog likes:", error);
    res.status(500).json({ error: error.message });
  }
};

const rejectBlog = async (req, res) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "You must be an admin to reject blogs." });
  }

  const { message } = req.body;
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    blog.status = "rejected";
    blog.rejectionMessage = message;
    await blog.save();

    res.status(200).json({ message: "Blog rejected successfully", blog });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error rejecting blog", error: error.message });
  }
};

const getLatestBlogsByViews = async (req, res) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    let blogs = await Blog.find({
      createdAt: { $gte: oneWeekAgo },
      status: "published",
    })
      .populate("author", "name userName email profileImage subscription")
      .populate("category", "name")
      .sort({ views: -1 })
      .limit(3); 

    if (blogs.length < 3) {
      const weeklyBlogIds = blogs.map(blog => blog._id);
      const remainingCount = 3 - blogs.length;

      const additionalBlogs = await Blog.find({
        status: "published",
        _id: { $nin: weeklyBlogIds } 
      })
        .populate("author", "name userName email profileImage subscription")
        .populate("category", "name")
        .sort({ views: -1, createdAt: -1 })
        .limit(remainingCount);

      blogs = [...blogs, ...additionalBlogs];
    }

    if (blogs.length === 0) {
      return res.status(400).json({ error: "No blogs found" });
    }

    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPopularBlog = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    let blogs = await Blog.aggregate([
      {
        $match: {
          status: "published",
          publishedAt: { $gte: threeDaysAgo },
        },
      },
      {
        $addFields: {
          isRecent: { $cond: [{ $gte: ["$publishedAt", threeDaysAgo] }, 1, 0] },
        },
      },
      { $sort: { isRecent: -1, views: -1, publishedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      { $unwind: "$author" },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categories",
        },
      },
      {
        $project: {
          title: 1,
          content: 1,
          views: 1,
          publishedAt: 1,
          categories: 1,
          image: 1,
          isRecent: 1,
          "author.name": 1,
          "author.userName": 1,
          "author.email": 1,
          "author.profileImage": 1,
        },
      },
    ]);

    if (!blogs || blogs.length === 0) {
      blogs = await Blog.aggregate([
        {
          $match: { status: "published" },
        },
        { $sort: { views: -1, publishedAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categories",
          },
        },
        {
          $project: {
            title: 1,
            content: 1,
            views: 1,
            publishedAt: 1,
            categories: 1,
            image: 1,
            isRecent: 1,
            "author.name": 1,
            "author.userName": 1,
            "author.email": 1,
            "author.profileImage": 1,
          },
        },
      ]);
    }

    const totalBlogs = await Blog.countDocuments({ status: "published" });
    const totalPages = Math.ceil(totalBlogs / limit);

    res.status(200).json({
      blogs,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching popular blogs:", error);
    res.status(500).json({ error });
  }
};

const getPopularBlogsOfMonth = async (req, res) => {
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    let blogs = await Blog.aggregate([
      {
        $match: { status: "published", publishedAt: { $gte: oneMonthAgo } },
      },
      {
        $sort: { views: -1, publishedAt: -1 },
      },
      { $limit: 3 }, 
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: "$category",
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $unwind: "$author",
      },
      {
        $project: {
          title: 1,
          content: 1,
          views: 1,
          publishedAt: 1,
          image: 1,
          "category.name": 1,
          "author.name": 1,
          "author.userName": 1,
          "author.email": 1,
          "author.profileImage": 1,
        },
      },
    ]);

    if (blogs.length < 3) {
      const monthlyBlogIds = blogs.map(blog => blog._id);
      const remainingCount = 3 - blogs.length;

      const additionalBlogs = await Blog.aggregate([
        {
          $match: { 
            status: "published",
            _id: { $nin: monthlyBlogIds } 
          },
        },
        {
          $sort: { views: -1, publishedAt: -1 },
        },
        { $limit: remainingCount },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $unwind: "$category",
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
        {
          $project: {
            title: 1,
            content: 1,
            views: 1,
            publishedAt: 1,
            image: 1,
            "category.name": 1,
            "author.name": 1,
            "author.userName": 1,
            "author.email": 1,
            "author.profileImage": 1,
          },
        },
      ]);

      blogs = [...blogs, ...additionalBlogs];
    }

    res.status(200).json({ blogs });
  } catch (error) {
    console.error("Error fetching popular blogs of the month:", error);
    res.status(500).json({ error: error.message });
  }
};

const incrementViews = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    blog.views += 1;
    await blog.save();
    res.status(200).json({ views: blog.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const incrementShares = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }
    blog.shares += 1;
    await blog.save();
    res.status(200).json({ shares: blog.shares });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBlogsByCategoryPage = async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories) || categories.length === 0) {
    return res
      .status(400)
      .json({ message: "Categories must be an array and cannot be empty." });
  }

  try {
    const blogs = await Blog.find({
      category: { $in: categories },
      status: "published",
    })
      .sort({ createdAt: -1 })
      .populate("author", "name userName email profileImage subscription")
      .populate("likes", "name profileImage");

    const blogsByCategoryGrp = categories.map((category) => ({
      category,
      blogs: blogs
        .filter((blog) => blog.category.includes(category))
        .slice(0, 5),
    }));

    return res.status(200).json({ blogsByCategoryGrp });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: error.message });
  }
};

const getRecommendedBlogs = async (req, res) => {
  try {
    const id = req.params.id;
    const { bId } = req.body;

    // console.log(bId)
    // const user = await Blog.findById(req.user?.id);
    let blogs;

    if (id) {
      blogs = await Blog.find({
        category: { $in: id },
        status: "published",
        _id: { $ne: bId },
      })
        .sort({ likes: -1, createdAt: -1 })
        .limit(3);
    } else {
      blogs = await Blog.aggregate([
        {
          $match: {
            status: "published",
            _id: { $ne: mongoose.Types.ObjectId(bId) },
          },
        },
        { $sample: { size: 3 } },
      ]);
    }

    return res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchBlogByQuery = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Please provide a search query" });
    }

    const queryWords = q.toLowerCase().split(" ");
    const blogs = await Blog.find({ status: "published" }, "title")
      .select("title category tags createdAt status author")
      .populate("author", "name email subscription")
      .populate("category", "name")
      .populate("tags", "name");

    const results = blogs
      .map((blog) => {
        const titleWords = blog.title.toLowerCase().split(" ");
        let matchScore = 0;

        queryWords.forEach((queryWord) => {
          titleWords.forEach((titleWord) => {
            if (queryWord.length < 3) {
              if (queryWord === titleWord) {
                matchScore++;
              }
            } else {
              const distance = levenshtein.get(queryWord, titleWord);
              if (distance <= 2) {
                matchScore++;
              }
            }
          });
        });

        return { blog, matchScore };
      })
      .filter((result) => result.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((result) => result.blog);

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

const getAllBlogsForAdmin = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const blogs = await Blog.find()
      .select("title category tags createdAt author status scheduledPublishDate publishedAt")
      .populate("author", "name email subscription")
      .populate("category", "name")
      .populate("tags", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalBlogs = await Blog.countDocuments();
    const totalPages = Math.ceil(totalBlogs / limit);

    res.status(200).json({
      blogs,
      totalBlogs,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching blogs for admin:", error);
    res.status(500).json({ error: error.message });
  }
};

const getContentBasedRecommendations = async (req, res) => {
  const { interests } = req.body;
  const userId = req.user ? req.user.id : null;

  try {
    let recommendations = [];

    if (Array.isArray(interests) && interests.length > 0) {
      let query = {
        category: { $in: interests },
        status: "published",
      };
      if (userId) {
        query.likes = { $ne: userId };
      }

      const blogs = await Blog.find(query)
        .sort({ createdAt: -1 })
        .populate("author", "name subscription")
        .populate("category", "name")
        .populate("tags", "name");

      const shuffledBlogs = blogs.sort(() => Math.random() - 0.5);
      recommendations = shuffledBlogs.slice(0, 12);
    } else {
      recommendations = await Blog.aggregate([
        { $match: { status: "published" } },
        { $sample: { size: 12 } },
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        {
          $lookup: {
            from: "tags",
            localField: "tags",
            foreignField: "_id",
            as: "tags",
          },
        },
        {
          $project: {
            title: 1,
            content: 1,
            "author.name": 1,
            "category.name": 1,
            "tags.name": 1,
            createdAt: 1,
            image: 1,
          },
        },
      ]);
    }

    res.status(200).json({ recommendations });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
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
  getAllUnApprovedBlogs,
  rejectBlog,
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
};
