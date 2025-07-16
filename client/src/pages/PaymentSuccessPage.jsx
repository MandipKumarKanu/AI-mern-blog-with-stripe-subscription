import React, { useEffect, useState } from 'react';
import { Check, ArrowRight, Receipt, Home, CreditCard, Crown, Diamond, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyPaymentSession } from '@/components/api/payment';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import Loader from '@/components/Loader';
import PremiumBadge from '@/components/PremiumBadge';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);
  
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && user && !paymentData && !error) {
      verifyPayment();
    } else if (!sessionId) {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId, user]); // Removed paymentData and error from dependencies to prevent infinite loop

  const verifyPayment = async () => {
    try {
      setLoading(true);
      const response = await verifyPaymentSession(sessionId);
      setPaymentData(response.data);
      
      // Update user in store with new subscription
      if (response.data.subscription) {
        setUser({
          ...user,
          subscription: response.data.subscription
        });
      }
      
      toast.success('Payment verified successfully!');
    } catch (error) {
      console.error('Error verifying payment:', error);
      setError(error.response?.data?.message || 'Failed to verify payment');
      toast.error('Error verifying payment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Payment Verification Failed</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-y-2">
              <Link to="/billing" className="w-full">
                <Button className="w-full">Try Again</Button>
              </Link>
              <Link to="/" className="w-full">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Success Card */}
        <Card className="text-center border shadow-lg">
          <CardHeader className="pb-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-primary/20">
              <Check className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-3xl text-foreground">
              Payment Successful!
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-2">
              Welcome to the premium experience
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {paymentData?.subscription && (
              <div className="bg-muted/50 p-6 rounded-lg border">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <PremiumBadge 
                    plan={paymentData.subscription.plan} 
                    size="lg"
                  />
                  <span className="text-2xl font-bold text-foreground">
                    Subscription Activated
                  </span>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="bg-card p-4 rounded-lg border">
                    <p className="text-muted-foreground mb-1">Plan</p>
                    <p className="font-semibold text-foreground capitalize">
                      {paymentData.subscription.plan} Plan
                    </p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border">
                    <p className="text-muted-foreground mb-1">Status</p>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {paymentData.subscription.status}
                    </Badge>
                  </div>
                  <div className="bg-card p-4 rounded-lg border">
                    <p className="text-muted-foreground mb-1">Valid Until</p>
                    <p className="font-semibold text-foreground">
                      {formatDate(paymentData.subscription.endDate)}
                    </p>
                  </div>
                  <div className="bg-card p-4 rounded-lg border">
                    <p className="text-muted-foreground mb-1">Access</p>
                    <p className="font-semibold text-primary">
                      Unlimited Features
                    </p>
                  </div>
                </div>

                {paymentData.subscription.features && (
                  <div className="mt-4">
                    <p className="font-medium text-foreground mb-3">Your Premium Features:</p>
                    <div className="grid gap-2">
                      {paymentData.subscription.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-3">
              <Link to="/billing" className="w-full">
                <Button variant="outline" className="w-full group">
                  <Receipt className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  View Transactions
                </Button>
              </Link>
              {paymentData?.subscription?.plan === 'pro' ? (
                <Link to="/create" className="w-full">
                  <Button className="w-full group">
                    <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                    Create Your First Blog
                  </Button>
                </Link>
              ) : (
                <Link to="/blogs" className="w-full">
                  <Button className="w-full group">
                    <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                    Explore Blogs
                  </Button>
                </Link>
              )}
              <Link to="/" className="w-full">
                <Button variant="outline" className="w-full group">
                  <Home className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Next Steps
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✨ Start exploring unlimited AI summaries for any blog</p>
              {paymentData?.subscription?.plan === 'pro' && (
                <p>📝 Create and publish your own blog posts</p>
              )}
              <p>🎯 Enjoy an ad-free reading experience</p>
              <p>💎 Your premium badge will now appear throughout the platform</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
