import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Crown, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { summarizeBlogWithSubscription, getUserSubscription } from '@/components/api/payment';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';
import { toast } from 'sonner';

const AISummaryComponent = ({ blogId }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Fetch subscription data when component mounts (only if user is logged in)
  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await getUserSubscription();
      setSubscriptionData(response.data);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  const handleSummaryClick = async () => {
    // Check if user is logged in
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    // Check if user has remaining usage (skip check for admin users)
    if (user.role !== 'admin' && subscriptionData?.aiUsage?.remaining === 0) {
      setShowUpgradeDialog(true);
      return;
    }

    // Generate summary
    await generateSummary();
  };

  const generateSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await summarizeBlogWithSubscription(blogId);
      
      setSummary(response.data.summary);
      
      // Update subscription data with new usage info
      if (response.data.usageInfo) {
        setSubscriptionData(prev => ({
          ...prev,
          aiUsage: response.data.usageInfo
        }));
      }
      
      toast.success('AI summary generated successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to generate summary';
      setError(errorMessage);
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        setShowLoginDialog(true);
      } else if (error.response?.status === 403) {
        setShowUpgradeDialog(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Generating AI summary...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-destructive">⚠️</span>
            <p className="text-destructive font-medium">Error</p>
          </div>
          <p className="text-destructive text-sm mb-3">{error}</p>
          <Button
            variant="outline"
            onClick={handleSummaryClick}
            className="w-full"
            size="sm"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Render summary if available
  if (summary) {
    const cleanSummary = summary
      .replace(/```html\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const sanitizedSummary = DOMPurify.sanitize(cleanSummary, {
      ADD_ATTR: ["class"],
    });

    return (
      <div className="space-y-4">
        {/* Usage info for logged-in users */}
        {user && subscriptionData && (
          <div className="bg-muted/50 border border-border p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">AI Usage This Month</span>
              <Badge variant={subscriptionData.subscription.plan === 'free' ? 'secondary' : 'default'}>
                {subscriptionData.subscription.plan.toUpperCase()}
              </Badge>
            </div>
            {subscriptionData.subscription.plan === 'free' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{subscriptionData.aiUsage.used} / {subscriptionData.aiUsage.limit} used</span>
                  <span>{subscriptionData.aiUsage.remaining} remaining</span>
                </div>
                <Progress 
                  value={(subscriptionData.aiUsage.used / subscriptionData.aiUsage.limit) * 100} 
                  className="h-2"
                />
              </div>
            )}
          </div>
        )}

        {/* Summary content */}
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
          {/* <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <h4 className="font-semibold text-card-foreground">AI Summary</h4>
          </div> */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="[&>ul]:list-disc [&>ul]:ml-6 [&>ul]:space-y-2 [&>ul]:text-muted-foreground">
              {parse(sanitizedSummary)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render initial state
  return (
    <div className="space-y-4">
      {/* Usage info for logged-in users */}
      {user && subscriptionData && (
        <div className="bg-muted/50 border border-border p-3 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">AI Usage This Month</span>
            <Badge variant={subscriptionData.subscription.plan === 'free' ? 'secondary' : 'default'}>
              {user.role === 'admin' ? 'ADMIN' : subscriptionData.subscription.plan.toUpperCase()}
            </Badge>
          </div>
          {/* Show usage info only for free plan users (not admin, premium, or pro) */}
          {subscriptionData.subscription.plan === 'free' && user.role !== 'admin' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{subscriptionData.aiUsage.used} / {subscriptionData.aiUsage.limit} used</span>
                <span>{subscriptionData.aiUsage.remaining} remaining</span>
              </div>
              <Progress 
                value={(subscriptionData.aiUsage.used / subscriptionData.aiUsage.limit) * 100} 
                className="h-2"
              />
            </div>
          )}
          {/* Show unlimited access message for admin, premium, and pro users */}
          {(user.role === 'admin' || ['premium', 'pro'].includes(subscriptionData.subscription.plan)) && (
            <div className="text-xs text-muted-foreground text-center">
              <span className="font-medium text-primary">Unlimited AI Summaries</span>
            </div>
          )}
        </div>
      )}

      {/* Generate button */}
      <Button
        onClick={handleSummaryClick}
        className="w-full group hover:bg-primary/90 transition-colors"
        variant="outline"
        disabled={user && user.role !== 'admin' && subscriptionData?.aiUsage?.remaining === 0}
      >
        <Sparkles className="mr-2 h-4 w-4 text-primary" />
        {!user ? 'Login to Generate AI Summary' : 'Generate AI Summary'}
        <ArrowRight className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>
      
      <p className="text-sm text-muted-foreground text-center">
        {!user 
          ? 'Sign in to get AI-powered article summaries'
          : 'Let AI create a quick overview of this article'
        }
      </p>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Login Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please log in to access AI summary features. Free users get 5 summaries per month!
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/auth?tab=login" className="w-full">
                <Button className="w-full">
                  Login Now
                </Button>
              </Link>
              <Link to="/auth?tab=register" className="w-full">
                <Button variant="outline" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              Upgrade Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You've reached your monthly limit of AI summaries. Upgrade to Premium for unlimited access!
            </p>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">Premium Benefits:</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Unlimited AI summaries</li>
                <li>• No advertisements</li>
                <li>• Premium badge</li>
                <li>• Priority support</li>
              </ul>
            </div>
            <Link to="/pricing" className="w-full">
              <Button className="w-full bg-amber-600 hover:bg-amber-700">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AISummaryComponent;
