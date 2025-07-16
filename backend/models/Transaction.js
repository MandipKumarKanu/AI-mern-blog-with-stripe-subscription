const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },

  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  amount: {
    type: Number,
    required: true 
  },
  currency: {
    type: String,
    default: 'usd'
  },
  
  plan: {
    type: String,
    enum: ['premium', 'pro'],
    required: true
  },
  planName: String,
  
  paymentGateway: {
    type: String,
    default: 'stripe'
  },
  
  stripeSessionId: String,
  stripeSubscriptionId: String,
  stripeCustomerId: String,
  stripePaymentIntentId: String,
  stripeInvoiceId: String,
  
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  
  type: {
    type: String,
    enum: ['subscription', 'renewal', 'upgrade', 'cancellation', 'refund'],
    default: 'subscription'
  },
  
  billingPeriod: {
    startDate: Date,
    endDate: Date
  },
  
  paymentMethod: {
    type: String,
    default: 'card'
  },
  
  description: String,
  metadata: {
    type: Map,
    of: String
  },
  
  paidAt: Date,
  failedAt: Date,
  refundedAt: Date,
  
}, {
  timestamps: true
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ stripeSessionId: 1 });
transactionSchema.index({ stripeSubscriptionId: 1 });
transactionSchema.index({ status: 1 });

transactionSchema.virtual('formattedAmount').get(function() {
  return (this.amount / 100).toFixed(2);
});

transactionSchema.virtual('summary').get(function() {
  return `${this.planName} - $${this.formattedAmount} (${this.status})`;
});

module.exports = mongoose.model('Transaction', transactionSchema);
