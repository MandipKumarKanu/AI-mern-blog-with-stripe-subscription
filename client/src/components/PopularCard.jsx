import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, User2, Heart, Share2, ArrowUpRight } from "lucide-react";
import parse from "html-react-parser";
import { Link } from "react-router-dom";

const PopularCard = ({ post }) => {
  const options = {
    replace: (domNode) => {
      if (domNode.type === "tag" && domNode.attribs && domNode.attribs.ref) {
        delete domNode.attribs.ref;
      }
    },
  };

  const renderContent = () => {
    try {
      return parse(post.content, options);
    } catch (error) {
      console.error("Error parsing HTML:", error);
      return post.content;
    }
  };

  return (
    <Card className="group hover:shadow-2xl transition-shadow duration-300 overflow-hidden rounded-2xl border">
      <div className="flex flex-col md:flex-row h-full">
        <div className="relative w-full md:w-[35%] h-72 md:h-auto shrink-0 overflow-hidden rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none">
          <Link to={`/blog/${post?._id}`} className=" overflow-hidden">
            <img
              src={post.image}
              loading="lazy"
              alt={post.title}
              className="w-full max-h-[390px] h-full object-cover transform transition-transform duration-500 group-hover:scale-105 rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none"
            />
            <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover:opacity-10" />
          </Link>
          <div className="absolute top-4 left-4">
            <div className="bg-primary/80 rounded-full text-xs text-white px-4 py-1 shadow-md">
              {post?.category?.[0].name ||
                post?.categories?.[0].name ||
                "Other"}
            </div>
          </div>
        </div>

        <CardContent className="flex-1 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-4 leading-snug hover:text-primary transition-colors duration-300">
              <Link to={`/blog/${post?._id}`}>{post.title}</Link>
            </h3>
            <div className="text-muted-foreground mb-6 line-clamp-3 text-base max-h-[105px]">
              {renderContent()}
            </div>
            <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4 text-primary" />
                {post.author?.name || "Unknown Author"}
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {new Date(post.publishedAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-border/20">
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted-foreground/10 pl-3 rounded-3xl py-2 pr-6 border-2 hover:bg-muted-foreground/20 transition-colors">
                <Heart className="h-4 w-4 text-rose-500" />
                <span>{post?.likes?.length || 0}</span>
              </div>
              <div className="flex items-center gap-2 bg-muted-foreground/10 pl-3 rounded-3xl py-2 pr-6 border-2 hover:bg-muted-foreground/20 transition-colors">
                <Share2 className="h-4 w-4 text-blue-500" />
                <span>{post?.shares || 0}</span>
              </div>
            </div>

            <Link to={`/blog/${post?._id}`}>
              <Button
                variant="ghost"
                className="w-full sm:w-auto group rounded-full px-6 py-3 text-primary hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                Read Article
                <ArrowUpRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default PopularCard;
