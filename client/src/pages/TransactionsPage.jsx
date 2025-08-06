import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Calendar, 
  Coins, 
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/useAuthStore';
import { getTransactions, getTransactionDetails, getUserSubscription, cancelSubscription } from '@/components/api/payment';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PremiumBadge from '@/components/PremiumBadge';

const TransactionsPage = () => {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactions(currentPage);
      fetchSubscription();
    }
  }, [user, currentPage]);

  const fetchTransactions = async (page = 1) => {
    try {
      setLoading(true);
      const response = await getTransactions(page, 10);
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load transactions');
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscription = async () => {
    try {
      setSubscriptionLoading(true);
      const response = await getUserSubscription();
      setSubscription(response.data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleViewDetails = async (transactionId) => {
    try {
      const response = await getTransactionDetails(transactionId);
      setSelectedTransaction(response.data.transaction);
      setShowDetails(true);
    } catch (error) {
      toast.error('Failed to load transaction details');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelLoading(true);
      const response = await cancelSubscription();
      
      if (response.data.success) {
        toast.success('Subscription cancelled successfully. You\'ll have access until the end of your billing period.');
        setSubscription(prev => prev ? { ...prev, status: 'cancelled' } : null);
        setShowCancelDialog(false);
        
        // Refresh subscription data
        await fetchSubscription();
        
        // Also refresh transactions to show the cancellation record
        await fetchTransactions(currentPage);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'refunded': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'subscription': return '🎯';
      case 'renewal': return '🔄';
      case 'upgrade': return '⬆️';
      case 'cancellation': return '❌';
      case 'refund': return '💰';
      default: return '💳';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, currency = 'npr') => {
    if (currency.toLowerCase() === 'npr') {
      return `NPR ${(amount / 100).toFixed(2)}`;
    } else {
      return `NPR ${(amount / 100).toFixed(2)}`;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Login Required</h2>
            <p className="text-muted-foreground">Please log in to view your transaction history.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Transaction History</h1>
            <p className="text-muted-foreground">View and manage your payment transactions</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTransactions(currentPage);
              fetchSubscription();
            }}
            disabled={loading || subscriptionLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || subscriptionLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold text-foreground">{pagination.totalTransactions || 0}</p>
                </div>
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Subscription</p>
                  {subscriptionLoading ? (
                    <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-foreground">
                        {subscription?.plan?.toUpperCase() || 'FREE'}
                      </p>
                      <PremiumBadge plan={subscription?.plan} size="sm" />
                    </div>
                  )}
                </div>
                {subscriptionLoading ? (
                  <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                ) : (
                  <Badge className={`
                    ${subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                      subscription?.status === 'cancelled' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'}
                  `}>
                    {subscription?.status || 'free'}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Next Billing</p>
                  {subscriptionLoading ? (
                    <div className="animate-pulse bg-gray-200 h-5 w-24 rounded"></div>
                  ) : (
                    <p className="text-lg font-semibold text-foreground">
                      {subscription?.endDate 
                        ? new Date(subscription.endDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A'
                      }
                    </p>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Search transactions..."
                  className="w-64"
                  prefix={<Search className="h-4 w-4" />}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted rounded-full"></div>
                      <div className="space-y-2">
                        <div className="w-32 h-4 bg-muted rounded"></div>
                        <div className="w-24 h-3 bg-muted rounded"></div>
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-muted rounded"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground">Your transaction history will appear here once you make a purchase.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction._id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-lg">
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{transaction.planName}</h4>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.createdAt)} • {transaction.type}
                        </p>
                        {transaction.description && (
                          <p className="text-xs text-muted-foreground mt-1">{transaction.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatAmount(transaction.amount, transaction.currency)}</p>
                        <p className="text-sm text-muted-foreground">{transaction.currency.toUpperCase()}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(transaction._id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalTransactions)} of {pagination.totalTransactions} results
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={!pagination.hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details Modal */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                    <p className="font-mono text-sm bg-muted p-2 rounded mt-1">{selectedTransaction.transactionId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedTransaction.status)}>
                        {selectedTransaction.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                    <p className="text-lg font-semibold text-foreground mt-1">
                      {formatAmount(selectedTransaction.amount, selectedTransaction.currency)} {selectedTransaction.currency.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plan</label>
                    <p className="text-lg font-semibold text-foreground mt-1">{selectedTransaction.planName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-foreground mt-1">{formatDate(selectedTransaction.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-foreground mt-1">{selectedTransaction.type}</p>
                  </div>
                </div>

                {selectedTransaction.billingPeriod && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Billing Period</label>
                    <p className="text-foreground mt-1">
                      {formatDate(selectedTransaction.billingPeriod.startDate)} - {formatDate(selectedTransaction.billingPeriod.endDate)}
                    </p>
                  </div>
                )}

                {selectedTransaction.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-foreground mt-1">{selectedTransaction.description}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    Close
                  </Button>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Subscription Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Cancel Subscription
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-800 mb-2">
                  <strong>Are you sure you want to cancel your {subscription?.plan} subscription?</strong>
                </p>
                <p className="text-sm text-red-700">
                  You'll continue to have access to premium features until {subscription?.endDate 
                    ? new Date(subscription.endDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'the end of your billing period'
                  }.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">What you'll lose:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Unlimited AI blog summaries</li>
                  <li>• Ad-free reading experience</li>
                  <li>• Premium badge and priority support</li>
                  {subscription?.plan === 'pro' && <li>• Ability to create blog posts</li>}
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancelLoading}
                >
                  Keep Subscription
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={cancelLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {cancelLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Yes, Cancel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Subscription Management */}
        {subscription && subscription.plan !== 'free' && subscription.status === 'active' && (
          <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Subscription Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-muted-foreground  mb-1">
                    Cancel Your {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Subscription
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    You'll continue to have access until {subscription.endDate 
                      ? new Date(subscription.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'the end of your billing period'
                    }
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowCancelDialog(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
