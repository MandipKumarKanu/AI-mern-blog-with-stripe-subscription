import React, { useEffect, useRef, useState } from "react";
import {
  Share2,
  MessageCircleDashed,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import DOMPurify from "dompurify";
import parse from "html-react-parser";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getBlogById,
  incShare,
  incView,
  likeBlog,
} from "@/components/api/blog";
import getErrorMessage from "@/components/utils/getErrorMsg";
import { format } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import { RWebShare } from "react-web-share";
import BlogSkeleton from "@/components/BlogSkeleton";
import ShrinkDescription from "@/components/ShrinkDescription";
import CommentsDialog from "@/components/CommentSection";
import RecommendedBlog from "@/components/RecommendedBlog";
import { Skeleton } from "@/components/ui/skeleton";
import usePageStayTimer from "@/hooks/useIntersetCalc";
import AISummaryComponent from "@/components/AISummaryComponent";
import PremiumBadge from "@/components/PremiumBadge";
import AdContainer from "@/components/AdContainer";
import PopupAd from "@/components/PopupAd";
import usePopupAd from "@/hooks/usePopupAd";

const configureDOMPurify = () => {
  DOMPurify.addHook("afterSanitizeAttributes", function (node) {
    if (node.tagName === "IFRAME") {
      if (
        node.getAttribute("src") &&
        (node.getAttribute("src").indexOf("youtube.com") > -1 ||
          node.getAttribute("src").indexOf("youtu.be") > -1)
      ) {
        node.setAttribute("allowfullscreen", "true");
      }
    }

    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });

  const purifyConfig = {
    ADD_TAGS: ["iframe", "blockquote", "script"],
    ADD_ATTR: [
      "allowfullscreen",
      "frameborder",
      "allow",
      "referrerpolicy",
      "src",
      "class",
      "href",
      "target",
      "rel",
      "title",
      "dir",
      "lang",
      "async",
      "charset",
      "data-theme",
      "data-tweet-id",
    ],
  };

  return purifyConfig;
};

export default function BlogPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blog, setBlog] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState();
  const [hoveredImg, setHoveredImg] = useState(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseEnter = (imgSrc) => {
    setHoveredImg(imgSrc);
  };

  const handleMouseLeave = () => {
    setHoveredImg(null);
  };

  const blogContentRef = useRef(null);

  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const { id } = useParams();

  const { showPopup, closePopup } = usePopupAd(id, {
    showProbability: 1,
    minDelayMs: 2000,
    maxDelayMs: 5000,
    ignoreCooldown: true,
  });

  // const tags = blog?.tags?.map((tag) => tag.name) || [];

  const currentUrl = `${window.location.origin}${location.pathname}`;

  useEffect(() => {
    incrementView();
  }, []);

  useEffect(() => {
    if (!id) {
      navigate(-1);
      return;
    }

    const initializeBlog = async () => {
      try {
        await fetchBlog();
        if (token) {
          await checkLikeStatus();
        }
      } catch (error) {
        console.error("Error initializing blog:", error);
      }
    };

    initializeBlog();
  }, [id]);

  useEffect(() => {
    if (blog?.content) {
      const script = document.getElementById("twitter-widget-script");
      if (!script) {
        const newScript = document.createElement("script");
        newScript.id = "twitter-widget-script";
        newScript.src = "https://platform.twitter.com/widgets.js";
        newScript.async = true;
        newScript.charset = "utf-8";
        document.body.appendChild(newScript);
      } else {
        window?.twttr?.widgets?.load();
      }
    }
  }, [blog]);

  useEffect(() => {
    if (blog && !user) {
      const catId = blog.category?.[0]?._id;
      if (catId) {
        let interests = [];
        try {
          interests = JSON.parse(localStorage.getItem("interest")) || [];
        } catch {
          interests = [];
        }
        const updatedInterests = [...new Set([...interests, catId])];
        if (updatedInterests.length > 5) {
          updatedInterests.splice(0, updatedInterests.length - 5);
        }
        localStorage.setItem("interest", JSON.stringify(updatedInterests));
      }
    }
  }, [blog, user]);

  const incrementView = async () => {
    try {
      await incView(id);
    } catch (error) {
      console.log(getErrorMessage(error));
    }
  };

  const incrementShare = async () => {
    try {
      const response = await incShare(id);
      setBlog((prev) =>
        prev ? { ...prev, shares: response.data.shares } : prev
      );
    } catch (error) {
      console.log(getErrorMessage(error));
    }
  };

  const incrementComment = () => {
    setCommentCount((prevCount) => prevCount + 1);
  };

  const checkLikeStatus = async () => {
    try {
      setLikeLoading(true);
      const response = await likeBlog(id);
      setIsLiked(response.data.isLiked);
    } catch (error) {
      console.log(getErrorMessage(error));
    } finally {
      setLikeLoading(false);
    }
  };

  const fetchBlog = async () => {
    try {
      setLoading(true);
      const response = await getBlogById(id);
      const fetchedBlog = response.data.blog;
      setBlog(fetchedBlog);
      // usePageStayTimer(fetchedBlog.tags);
      // console.log(fetchedBlog.comments.length);
      setCommentCount(fetchedBlog.comments.length || 0);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!token) {
      return console.log("Need to login");
    }
    try {
      setLikeLoading(true);
      const response = await likeBlog(id, !isLiked);
      setIsLiked(response.data.isLiked);
      setBlog((prev) => ({
        ...prev,
        likes: new Array(response.data.likesCount).fill(null),
      }));

      if (response.data.isLiked && blog?.category?.[0]?._id) {
        let interests = [];
        try {
          interests = JSON.parse(localStorage.getItem("interest")) || [];
        } catch {
          interests = [];
        }
        const catId = blog.category[0]._id;
        const updatedInterests = [...new Set([...interests, catId])];
        if (updatedInterests.length > 5) {
          updatedInterests.splice(0, updatedInterests.length - 5);
        }
        localStorage.setItem("interest", JSON.stringify(updatedInterests));
      }
    } catch (error) {
      console.log(getErrorMessage(error));
    } finally {
      setLikeLoading(false);
    }
  };

  if (loading) {
    return <BlogSkeleton />;
  }

  // if (error) {
  //   return (
  //     <div className="min-h-screen flex flex-col items-center justify-center gap-4">
  //       <p className="text-red-500">{error}</p>
  //       <Button onClick={fetchBlog}>Try Again</Button>
  //     </div>
  //   );
  // }

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No blog data available.</p>
      </div>
    );
  }

  const processEmbeddedContent = (content) => {
    if (!content) return null;

    const decodedContent = content
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");

    const contentWithoutScripts = decodedContent.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );

    const purifyConfig = configureDOMPurify();
    const sanitizedContent = DOMPurify.sanitize(
      contentWithoutScripts,
      purifyConfig
    );

    return parse(sanitizedContent);
  };

  const blogContent = blog.content
    ? processEmbeddedContent(blog.content)
    : null;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="relative w-full h-[40vh] md:h-[50vh] overflow-hidden group">
        <img
          src={
            blog.image || "https://via.placeholder.com/1200x600?text=No+Image"
          }
          loading="lazy"
          alt="Blog Hero"
          className="w-full h-full object-cover transition-transform duration-500"
          onMouseMove={handleMouseMove}
          onMouseEnter={() =>
            handleMouseEnter(
              blog.image || "https://via.placeholder.com/1200x600?text=No+Image"
            )
          }
          onMouseLeave={handleMouseLeave}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent pointer-events-none" />
        <h2 className="absolute bottom-0 left-0 right-0 mx-auto p-4 text-center text-lg sm:text-xl md:text-3xl lg:text-4xl font-bold text-foreground/90 leading-tight drop-shadow-lg max-w-[90%] sm:max-w-[80%] md:max-w-[70%] lg:max-w-[60%]">
          {blog.title}
        </h2>
      </div>

      <div className="container mx-auto py-12 px-4 sm:px-6 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <aside className="order-first lg:order-last space-y-8 lg:sticky top-20 self-start">
          <div className="flex items-center gap-4 text-muted-foreground">
            <div
              className={`flex items-center gap-2 ${
                isLiked ? "bg-red-500/10" : "bg-muted-foreground/10"
              } bg-muted-foreground/10 pl-3 rounded-3xl py-2 pr-6 border-2 cursor-pointer`}
              onClick={() => {
                handleLike();
              }}
            >
              {likeLoading ? (
                <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
              ) : isLiked ? (
                <FaHeart className="h-4 w-4 text-rose-500" />
              ) : (
                <FaRegHeart className="h-4 w-4 text-gray-500" />
              )}
              <span>{blog.likes?.length || 0}</span>
            </div>
            <div
              className="flex items-center gap-2 bg-muted-foreground/10 pl-3 rounded-3xl py-2 pr-6 border-2 cursor-pointer"
              onClick={() => setCommentsOpen(true)}
            >
              <MessageCircleDashed className="h-4 w-4 text-blue-500" />
              <span>{commentCount}</span>
            </div>

            <RWebShare
              data={{
                text: `Check out "${blog.title}" - A must-read blog!`,
                url: currentUrl,
                title: `FutureBlog - ${blog.title}`,
              }}
              onClick={incrementShare}
            >
              <div className="flex items-center gap-2 bg-muted-foreground/10 pl-3 rounded-3xl py-2 pr-6 border-2 cursor-pointer">
                <Share2 className="h-4 w-4 text-blue-500" />
                <span>{blog?.shares || 0}</span>
              </div>
            </RWebShare>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs text-muted-foreground uppercase">
                  Date
                </span>
                <span className="block text-foreground">
                  {blog.publishedAt
                    ? format(new Date(blog.publishedAt), "PPP")
                    : "N/A"}
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase">
                  Category
                </span>
                <span className="block text-foreground">
                  <span className="block text-foreground">
                    {blog.category &&
                      blog.category.map((cat) => cat.name).join(", ")}
                  </span>
                </span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase">
                  Views
                </span>
                <span className="block text-foreground">{blog.views}</span>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground uppercase ">
                  Author
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to={
                      user && blog.author?._id === user.id
                        ? "/profile"
                        : `/profile/${blog.author?._id}`
                    }
                    className="block text-foreground hover:underline hover:text-primary transition-all duration-300"
                  >
                    {blog.author?.name || "Unknown"}
                  </Link>
                  <PremiumBadge
                    plan={blog.author?.subscription?.plan}
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              AI Summary
            </h3>
            <AISummaryComponent blogId={id} />
          </div>

          {/* Sidebar Ads */}
          <AdContainer placement="sidebar" limit={2} />
        </aside>

        <div
          className="order-last lg:order-first lg:col-span-2 space-y-8 lg:sticky top-20 self-start"
          ref={blogContentRef}
        >
          <ShrinkDescription desc={blogContent} />
        </div>
      </div>
      {hoveredImg && (
        <div
          className="fixed pointer-events-none z-50 hidden sm:block"
          style={{
            top: cursorPos.y + 20 + "px",
            left: cursorPos.x + 20 + "px",
          }}
        >
          <img
            src={hoveredImg}
            alt="Preview"
            className="w-56 h-36 object-cover rounded-lg shadow-lg border border-gray-300"
          />
        </div>
      )}
      {user && <RecommendedBlog cat={blog?.category?.[0]?._id} bId={id} />}

      <CommentsDialog
        blogId={id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        incrementComment={incrementComment}
        blogAuthorId={blog?.author?._id || ""}
      />

      {/* Popup Ad */}
      <PopupAd 
        isOpen={showPopup}
        onClose={closePopup}
        blogId={id}
      />
    </div>
  );
}
