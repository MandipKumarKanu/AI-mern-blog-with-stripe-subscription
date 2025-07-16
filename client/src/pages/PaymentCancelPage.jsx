import React from 'react';
import { X, ArrowLeft, RefreshCw, Home, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const PaymentCancelPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-background to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Cancel Card */}
        <Card className="text-center shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="relative mx-auto mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <X className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
              Payment Cancelled
            </CardTitle>
            <p className="text-muted-foreground text-lg mt-2">
              No worries, you can try again anytime
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5" />
                Still interested in Premium?
              </h4>
              <p className="text-sm text-blue-700 mb-4">
                You're just one step away from unlocking amazing features:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-blue-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Unlimited AI blog summaries
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Ad-free reading experience
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  Premium badge & priority support
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
              <p className="text-sm text-orange-700">
                <strong>No charges made:</strong> Your payment was safely cancelled and no amount was charged to your account.
              </p>
            </div>

            <div className="grid gap-3">
              <Link to="/pricing" className="w-full">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 group">
                  <RefreshCw className="h-4 w-4 mr-2 group-hover:rotate-180 transition-transform duration-300" />
                  Try Again
                </Button>
              </Link>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link to="/blogs" className="w-full">
                  <Button variant="outline" className="w-full group">
                    <CreditCard className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Browse Blogs
                  </Button>
                </Link>
                <Link to="/" className="w-full">
                  <Button variant="outline" className="w-full group">
                    <Home className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                    Go Home
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-lg">
          <CardContent className="p-6 text-center">
            <h3 className="font-semibold text-foreground mb-3">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              If you encountered any issues during payment, our support team is here to help.
            </p>
            <Link to="/contact">
              <Button variant="outline" size="sm" className="group">
                <span className="mr-2">💬</span>
                Contact Support
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCancelPage;
