const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const protect = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const router = express.Router();

// For webhook signature verification
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Subscription plans
const PLANS = {
  premium: {
    name: 'Premium',
    amount: 10000, // NPR 100.00 in paisa (100 * 100)
    duration: 30, // days
    features: [
      'Unlimited AI Summaries', 
      'No Ads', 
      'Priority Support',
      'Premium Badge'
    ],
    priceId: process.env.STRIPE_PREMIUM_PRICE_ID || process.env.STRIPE_PREMIUM_PRICE_ID_NPR // Stripe Price ID
  },
  pro: {
    name: 'Pro', 
    amount: 15000, // NPR 150.00 in paisa (150 * 100)
    duration: 30, // days
    features: [
      'Everything in Premium', 
      'Create Blog Posts',
      'Edit & Manage Blogs',
      'Pro Creator Badge'
    ],
    priceId: process.env.STRIPE_PRO_PRICE_ID || process.env.STRIPE_PRO_PRICE_ID_NPR // Stripe Price ID
  }
};

// @desc    Get available plans
// @route   GET /api/payment/plans
// @access  Public
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.amount / 100, // Convert cents to dollars
    duration: plan.duration,
    features: plan.features,
    priceId: plan.priceId
  }));

  res.json({
    success: true,
    plans: plans
  });
});

// @desc    Get user subscription status and AI usage
// @route   GET /api/payment/subscription
// @access  Private
router.get('/subscription', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription aiUsage');
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Initialize AI usage if not exists
    if (!user.aiUsage) {
      user.aiUsage = {
        month: currentMonth,
        year: currentYear,
        summaryCount: 0
      };
      await user.save();
    }

    // Reset counter if new month
    if (user.aiUsage.month !== currentMonth || user.aiUsage.year !== currentYear) {
      user.aiUsage = {
        month: currentMonth,
        year: currentYear,
        summaryCount: 0
      };
      await user.save();
    }

    const subscriptionPlan = user.subscription?.plan || 'free';
    const isActiveSubscription = user.subscription?.status === 'active' && 
                                user.subscription?.endDate > currentDate;

    const currentPlan = isActiveSubscription ? subscriptionPlan : 'free';
    
    // Define limits
    const limits = {
      free: 5,
      premium: Infinity,
      pro: Infinity
    };

    const monthlyLimit = limits[currentPlan];

    res.json({
      success: true,
      subscription: {
        plan: currentPlan,
        status: isActiveSubscription ? 'active' : 'free',
        features: currentPlan !== 'free' ? PLANS[currentPlan]?.features || [] : ['5 AI Summaries per month'],
        endDate: user.subscription?.endDate,
        isExpired: !isActiveSubscription
      },
      aiUsage: {
        used: user.aiUsage.summaryCount,
        limit: monthlyLimit,
        remaining: monthlyLimit === Infinity ? "unlimited" : Math.max(0, monthlyLimit - user.aiUsage.summaryCount)
      }
    });

  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching subscription details' 
    });
  }
});

// @desc    Create Stripe Checkout Session
// @route   POST /api/payment/create-checkout-session
// @access  Private
router.post('/create-checkout-session', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!PLANS[plan]) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid subscription plan' 
      });
    }

    const selectedPlan = PLANS[plan];
    
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // For recurring subscriptions
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      customer_email: req.user.email,
      metadata: {
        userId: req.user._id.toString(),
        plan: plan,
        userEmail: req.user.email
      }
    });

    // Create initial transaction record
    const transaction = new Transaction({
      userId: req.user._id,
      userEmail: req.user.email,
      userName: req.user.name,
      transactionId: session.id,
      amount: selectedPlan.amount,
      currency: 'usd',
      plan: plan,
      planName: selectedPlan.name,
      stripeSessionId: session.id,
      status: 'pending',
      type: 'subscription',
      description: `${selectedPlan.name} subscription purchase`,
      metadata: new Map([
        ['sessionUrl', session.url],
        ['planFeatures', selectedPlan.features.join(', ')]
      ])
    });

    await transaction.save();
    
    res.json({
      success: true,
      sessionId: session.id,
      url: session.url,
      planDetails: selectedPlan,
      transactionId: transaction._id
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating checkout session' 
    });
  }
});

// @desc    Handle Stripe Webhook
// @route   POST /api/payment/webhook
// @access  Public (but verified by Stripe signature)
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log('Webhook received:', event.type, event.data.object.id);
  
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Processing checkout.session.completed for session:', session.id);
      await handleSuccessfulPayment(session);
      break;
    case 'customer.subscription.updated':
      const updatedSubscription = event.data.object;
      console.log('Processing subscription update for:', updatedSubscription.id);
      await handleSubscriptionUpdate(updatedSubscription);
      break;
    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      console.log('Processing subscription deletion for:', deletedSubscription.id);
      await handleSubscriptionCancellation(deletedSubscription);
      break;
    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      console.log('Processing failed payment for invoice:', failedInvoice.id);
      await handleFailedPayment(failedInvoice);
      break;
    // Handle additional events to reduce unhandled warnings
    case 'customer.subscription.created':
      console.log('Subscription created:', event.data.object.id);
      break;
    case 'invoice.created':
    case 'invoice.finalized':
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      console.log(`Invoice event: ${event.type}`, event.data.object.id);
      break;
    case 'payment_intent.created':
    case 'payment_intent.succeeded':
      console.log(`Payment intent event: ${event.type}`, event.data.object.id);
      break;
    case 'charge.succeeded':
      console.log('Charge succeeded:', event.data.object.id);
      break;
    case 'payment_method.attached':
      console.log('Payment method attached:', event.data.object.id);
      break;
    case 'customer.created':
    case 'customer.updated':
      console.log(`Customer event: ${event.type}`, event.data.object.id);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Helper function to handle successful payment
const handleSuccessfulPayment = async (session) => {
  try {
    const { userId, plan } = session.metadata;
    
    if (!userId || !plan) {
      console.error('Missing metadata in session:', session.id);
      return;
    }

    console.log('Processing payment for session:', session.id);
    console.log('Session details:', {
      id: session.id,
      payment_status: session.payment_status,
      subscription: session.subscription
    });

    // Check if session has a subscription
    if (!session.subscription) {
      console.error('No subscription found in session:', session.id);
      return;
    }

    // For subscription mode, we get the subscription from the session
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    
    console.log('Subscription details:', {
      id: subscription.id,
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end
    });
    
    // Calculate subscription end date based on subscription period
    const currentDate = new Date();
    
    // Check if current_period_end exists and is valid
    if (!subscription.current_period_end) {
      console.error('No current_period_end in subscription:', subscription.id);
      // Fallback: add 30 days from now
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      
      console.log('Using fallback end date:', endDate);
      
      // Update user with subscription details
      await User.findByIdAndUpdate(userId, {
        subscription: {
          plan: plan,
          status: 'active',
          startDate: currentDate,
          endDate: endDate,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          sessionId: session.id
        }
      });

      // Update transaction record
      await Transaction.findOneAndUpdate(
        { stripeSessionId: session.id },
        {
          status: 'completed',
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer,
          stripePaymentIntentId: session.payment_intent,
          billingPeriod: {
            startDate: currentDate,
            endDate: endDate
          },
          paidAt: currentDate,
          metadata: new Map([
            ['subscriptionStatus', subscription.status],
            ['paymentStatus', session.payment_status],
            ['note', 'Used fallback end date due to missing current_period_end']
          ])
        }
      );

      console.log(`Subscription activated with fallback date for user ${userId}, plan: ${plan}, subscription ID: ${subscription.id}`);
      return;
    }
    
    const endDate = new Date(subscription.current_period_end * 1000); // Convert from Unix timestamp
    
    // Validate dates before saving
    if (isNaN(currentDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date values:', { 
        currentDate, 
        endDate, 
        current_period_end: subscription.current_period_end 
      });
      return;
    }

    console.log('Valid dates:', { currentDate, endDate });

    // Update user with subscription details
    const userUpdate = await User.findByIdAndUpdate(userId, {
      subscription: {
        plan: plan,
        status: 'active',
        startDate: currentDate,
        endDate: endDate,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        sessionId: session.id
      }
    }, { new: true });

    console.log('User updated successfully:', userUpdate?.subscription);

    // Update transaction record
    const transactionUpdate = await Transaction.findOneAndUpdate(
      { stripeSessionId: session.id },
      {
        status: 'completed',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        stripePaymentIntentId: session.payment_intent,
        billingPeriod: {
          startDate: currentDate,
          endDate: endDate
        },
        paidAt: currentDate,
        metadata: new Map([
          ['subscriptionStatus', subscription.status],
          ['paymentStatus', session.payment_status]
        ])
      },
      { new: true }
    );

    console.log('Transaction updated successfully:', transactionUpdate?.status);
    console.log(`Subscription activated for user ${userId}, plan: ${plan}, subscription ID: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling successful payment:', error);
    console.error('Error stack:', error.stack);
  }
};

// Helper function to handle subscription updates
const handleSubscriptionUpdate = async (subscription) => {
  try {
    // Find user by Stripe subscription ID
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
    
    if (!user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Update subscription status and end date
    const endDate = new Date(subscription.current_period_end * 1000);
    
    // Validate date before saving
    if (isNaN(endDate.getTime())) {
      console.error('Invalid end date for subscription:', subscription.id);
      return;
    }
    
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': subscription.status,
      'subscription.endDate': endDate
    });

    // Create renewal transaction record
    if (subscription.status === 'active') {
      const latestInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);
      
      const renewalTransaction = new Transaction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        transactionId: `renewal_${subscription.id}_${Date.now()}`,
        amount: latestInvoice.amount_paid,
        currency: latestInvoice.currency,
        plan: user.subscription.plan,
        planName: PLANS[user.subscription.plan]?.name || user.subscription.plan,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        stripeInvoiceId: latestInvoice.id,
        status: 'completed',
        type: 'renewal',
        billingPeriod: {
          startDate: new Date(subscription.current_period_start * 1000),
          endDate: endDate
        },
        paidAt: new Date(latestInvoice.status_transitions.paid_at * 1000),
        description: `${PLANS[user.subscription.plan]?.name || user.subscription.plan} subscription renewal`,
        metadata: new Map([
          ['subscriptionStatus', subscription.status],
          ['invoiceNumber', latestInvoice.number]
        ])
      });

      await renewalTransaction.save();
    }

    console.log(`Subscription updated for user ${user._id}, status: ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
};

// Helper function to handle subscription cancellation
const handleSubscriptionCancellation = async (subscription) => {
  try {
    // Find user by Stripe subscription ID
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
    
    if (!user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Update subscription status to cancelled
    await User.findByIdAndUpdate(user._id, {
      'subscription.status': 'cancelled',
      'subscription.endDate': new Date() // End immediately or keep until period end
    });

    // Create cancellation transaction record
    const cancellationTransaction = new Transaction({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      transactionId: `cancellation_${subscription.id}_${Date.now()}`,
      amount: 0,
      currency: 'usd',
      plan: user.subscription.plan,
      planName: PLANS[user.subscription.plan]?.name || user.subscription.plan,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer,
      status: 'completed',
      type: 'cancellation',
      description: `${PLANS[user.subscription.plan]?.name || user.subscription.plan} subscription cancelled`,
      metadata: new Map([
        ['cancellationReason', subscription.cancellation_details?.reason || 'user_requested'],
        ['cancelledAt', new Date().toISOString()]
      ])
    });

    await cancellationTransaction.save();

    console.log(`Subscription cancelled for user ${user._id}`);
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
};

// Helper function to handle failed payment
const handleFailedPayment = async (invoice) => {
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    // Find user by customer ID or subscription ID
    const user = await User.findOne({
      $or: [
        { 'subscription.stripeCustomerId': customerId },
        { 'subscription.stripeSubscriptionId': subscriptionId }
      ]
    });

    if (user) {
      // Create failed payment transaction record
      const failedTransaction = new Transaction({
        userId: user._id,
        userEmail: user.email,
        userName: user.name,
        transactionId: `failed_${invoice.id}_${Date.now()}`,
        amount: invoice.amount_due,
        currency: invoice.currency,
        plan: user.subscription?.plan || 'unknown',
        planName: PLANS[user.subscription?.plan]?.name || 'Unknown Plan',
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        stripeInvoiceId: invoice.id,
        status: 'failed',
        type: 'renewal',
        failedAt: new Date(),
        description: `Payment failed for ${PLANS[user.subscription?.plan]?.name || 'subscription'}`,
        metadata: new Map([
          ['failureReason', 'payment_failed'],
          ['attemptCount', invoice.attempt_count?.toString() || '1']
        ])
      });

      await failedTransaction.save();
    }
    
    console.log(`Payment failed for customer ${customerId}`);
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
};

// @desc    Verify payment session
// @route   GET /api/payment/verify-session/:sessionId
// @access  Private
router.get('/verify-session/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Check if session was already processed
    const existingTransaction = await Transaction.findOne({ 
      stripeSessionId: sessionId,
      status: 'completed'
    });
    
    if (existingTransaction) {
      // Return cached result
      const user = await User.findById(req.user._id).select('subscription');
      return res.json({
        success: true,
        message: 'Payment already verified',
        subscription: user.subscription,
        cached: true
      });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid' && session.subscription) {
      // Get the subscription details
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Get user's updated subscription
      const user = await User.findById(req.user._id).select('subscription');
      
      res.json({
        success: true,
        message: 'Payment successful! Subscription activated.',
        subscription: user.subscription,
        stripeSubscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_end: subscription.current_period_end
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed or subscription not created'
      });
    }
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment session'
    });
  }
});

// @desc    Cancel subscription
// @route   POST /api/payment/cancel-subscription
// @access  Private
router.post('/cancel-subscription', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Cancel the subscription in Stripe
    const cancelledSubscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true
      }
    );

    // Update user subscription status
    await User.findByIdAndUpdate(req.user._id, {
      'subscription.status': 'cancelled'
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. You\'ll have access until the end of your billing period.',
      subscription: {
        ...user.subscription.toObject(),
        status: 'cancelled'
      },
      period_end: new Date(cancelledSubscription.current_period_end * 1000)
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription'
    });
  }
});

// @desc    Get user transactions
// @route   GET /api/payment/transactions
// @access  Private
router.get('/transactions', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-metadata -__v');

    const totalTransactions = await Transaction.countDocuments({ userId: req.user._id });
    const totalPages = Math.ceil(totalTransactions / limit);

    res.json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction history'
    });
  }
});

// @desc    Get single transaction details
// @route   GET /api/payment/transactions/:id
// @access  Private
router.get('/transactions/:id', protect, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      transaction
    });

  } catch (error) {
    console.error('Error fetching transaction details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction details'
    });
  }
});

// @desc    Get all transactions (Admin only)
// @route   GET /api/payment/admin/transactions
// @access  Private/Admin
router.get('/admin/transactions', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin rights required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const type = req.query.type;
    const search = req.query.search;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
        { transactionId: { $regex: search, $options: 'i' } }
      ];
    }

    const transactions = await Transaction.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTransactions = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalTransactions / limit);

    // Get summary statistics
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalTransactions,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching admin transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction data'
    });
  }
});

// @desc    Get transaction statistics (Admin only)
// @route   GET /api/payment/admin/stats
// @access  Private/Admin
router.get('/admin/stats', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin rights required.'
      });
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Revenue statistics
    const [monthlyRevenue, yearlyRevenue, totalRevenue] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: startOfYear }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      Transaction.aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Plan distribution
    const planStats = await Transaction.aggregate([
      {
        $match: { status: 'completed', type: { $in: ['subscription', 'renewal'] } }
      },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      }
    ]);

    // Monthly growth
    const monthlyGrowth = await Transaction.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: new Date(today.getFullYear(), today.getMonth() - 11, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      success: true,
      stats: {
        revenue: {
          monthly: monthlyRevenue[0] || { total: 0, count: 0 },
          yearly: yearlyRevenue[0] || { total: 0, count: 0 },
          total: totalRevenue[0] || { total: 0, count: 0 }
        },
        plans: planStats,
        monthlyGrowth
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
});

// @desc    Manually process a checkout session (for testing/debugging)
// @route   POST /api/payment/process-session
// @access  Private/Admin
router.post('/process-session', protect, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('Manual processing session:', session.id);
    console.log('Session payment status:', session.payment_status);
    console.log('Session subscription:', session.subscription);

    if (session.payment_status === 'paid') {
      await handleSuccessfulPayment(session);
      
      res.json({
        success: true,
        message: 'Session processed successfully',
        session: {
          id: session.id,
          payment_status: session.payment_status,
          subscription: session.subscription
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Session payment not completed',
        payment_status: session.payment_status
      });
    }

  } catch (error) {
    console.error('Error processing session manually:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing session'
    });
  }
});

module.exports = router;
