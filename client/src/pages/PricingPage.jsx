import React, { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, Zap, Shield, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { getSubscriptionPlans, createCheckoutSession, getUserSubscription, verifyPaymentSession } from '@/components/api/payment';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PricingPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    fetchPlans();
    if (user) {
      fetchCurrentSubscription();
    }
    
    // Check if returning from successful payment
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      handlePaymentSuccess(sessionId);
    }
  }, [user, searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await getSubscriptionPlans();
      setPlans(response.data.plans);
    } catch (error) {
      toast.error('Failed to load pricing plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await getUserSubscription();
      setCurrentSubscription(response.data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handlePaymentSuccess = async (sessionId) => {
    try {
      // Verify the payment session
      const response = await verifyPaymentSession(sessionId);
      if (response.data.success) {
        toast.success('Payment successful! Your subscription has been activated.');
        fetchCurrentSubscription(); // Refresh subscription data
        // Remove session_id from URL
        navigate('/pricing', { replace: true });
      }
    } catch (error) {
      toast.error('Error verifying payment. Please contact support.');
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.error('Please login to subscribe');
      navigate('/auth?tab=login');
      return;
    }

    setPaymentLoading(planId);
    
    try {
      // Create Stripe checkout session
      const response = await createCheckoutSession(planId);
      const { url } = response.data;

      // Redirect to Stripe checkout
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setPaymentLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary to-accent-foreground bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Unlock the full potential of AI-powered blogging with our premium features
          </p>
        </div>

        {/* Current Subscription Status */}
        {user && currentSubscription && (
          <div className="text-center mb-8">
            <Badge variant={currentSubscription.plan === 'free' ? 'secondary' : 'default'} className="text-lg px-6 py-2">
              Current Plan: {currentSubscription.plan.toUpperCase()}
              {currentSubscription.plan !== 'free' && currentSubscription.endDate && (
                <span className="ml-2">
                  (Valid until {new Date(currentSubscription.endDate).toLocaleDateString()})
                </span>
              )}
            </Badge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2 border-border hover:border-border/80 transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Free</CardTitle>
              <div className="text-4xl font-bold text-foreground">NPR 0</div>
              <p className="text-muted-foreground">Perfect to get started</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>5 AI Summaries per month</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Read & Browse Blogs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Comment & Like Posts</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Community support</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-8"
                disabled={currentSubscription?.plan === 'free'}
              >
                {currentSubscription?.plan === 'free' ? 'Current Plan' : 'Get Started'}
              </Button>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-primary shadow-lg scale-105 hover:scale-110 transition-all duration-300">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1">Most Popular</Badge>
            </div>
            <CardHeader className="text-center pb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Premium</CardTitle>
              <div className="text-4xl font-bold text-primary">NPR 100</div>
              <p className="text-muted-foreground">per month</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Unlimited AI Summaries</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>No Advertisements</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Premium Badge</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Priority Support</span>
                </div>
              </div>
              <Button 
                className="w-full mt-8"
                onClick={() => handleSubscribe('premium')}
                disabled={paymentLoading === 'premium' || currentSubscription?.plan === 'premium'}
              >
                {paymentLoading === 'premium' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Redirecting to Stripe...
                  </>
                ) : currentSubscription?.plan === 'premium' ? (
                  'Current Plan'
                ) : (
                  <>
                    Upgrade to Premium
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card className="relative border-2 border-accent hover:border-accent/80 transition-all duration-300">
            <CardHeader className="text-center pb-8">
              <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle className="text-2xl">Pro</CardTitle>
              <div className="text-4xl font-bold text-accent-foreground">NPR 150</div>
              <p className="text-muted-foreground">per month · Content Creator</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Everything in Premium</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Create & Publish Blogs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Edit & Manage Your Blogs</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Pro Creator Badge</span>
                </div>
              </div>
              <Button 
                className="w-full mt-8 bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={() => handleSubscribe('pro')}
                disabled={paymentLoading === 'pro' || currentSubscription?.plan === 'pro'}
              >
                {paymentLoading === 'pro' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Redirecting to Stripe...
                  </>
                ) : currentSubscription?.plan === 'pro' ? (
                  'Current Plan'
                ) : (
                  <>
                    Upgrade to Pro
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Comparison */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Feature Comparison</h2>
          <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-lg overflow-hidden border border-border">
            <div className="grid grid-cols-4 border-b border-border">
              <div className="p-6 font-semibold text-foreground">Features</div>
              <div className="p-6 text-center font-semibold text-foreground">Free</div>
              <div className="p-6 text-center font-semibold text-primary">Premium</div>
              <div className="p-6 text-center font-semibold text-accent-foreground">Pro</div>
            </div>
            
            {[
              ['AI Summaries', '5/month', 'Unlimited', 'Unlimited'],
              ['Advertisements', 'Yes', 'No', 'No'],
              ['Blog Creation', 'No', 'No', 'Yes'],
              ['Support', 'Community', 'Priority', 'Priority'],
            ].map(([feature, free, premium, pro], index) => (
              <div key={index} className="grid grid-cols-4 border-b border-border/50 last:border-b-0">
                <div className="p-4 font-medium text-foreground">{feature}</div>
                <div className="p-4 text-center text-muted-foreground">{free}</div>
                <div className="p-4 text-center text-primary font-medium">{premium}</div>
                <div className="p-4 text-center text-accent-foreground font-medium">{pro}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-8 text-foreground">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-card p-6 rounded-lg shadow border border-border">
              <h3 className="font-semibold mb-2 text-foreground">Can I cancel my subscription anytime?</h3>
              <p className="text-muted-foreground">Yes, you can cancel your subscription at any time. You'll continue to have access to premium features until the end of your billing period.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow border border-border">
              <h3 className="font-semibold mb-2 text-foreground">What happens to my data if I downgrade?</h3>
              <p className="text-muted-foreground">Your content and data remain safe. You'll just lose access to premium features but can access them again by upgrading.</p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow border border-border">
              <h3 className="font-semibold mb-2 text-foreground">Is my payment information secure?</h3>
              <p className="text-muted-foreground">Yes, we use Stripe's secure payment processing. We never store your payment information on our servers. Stripe is trusted by millions of businesses worldwide.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
