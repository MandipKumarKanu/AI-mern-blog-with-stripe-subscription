const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'resolved'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  replies: [{
    message: {
      type: String,
      required: true
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    emailSent: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  readAt: Date,
  readBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  ipAddress: String,
  userAgent: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
contactMessageSchema.index({ email: 1 });
contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ priority: 1 });
contactMessageSchema.index({ createdAt: -1 });
contactMessageSchema.index({ 'replies.sentAt': -1 });

// Virtual for total replies count
contactMessageSchema.virtual('repliesCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for last reply date
contactMessageSchema.virtual('lastReplyAt').get(function() {
  if (this.replies && this.replies.length > 0) {
    return this.replies[this.replies.length - 1].sentAt;
  }
  return null;
});

// Method to mark as read
contactMessageSchema.methods.markAsRead = function(userId) {
  this.status = 'read';
  this.readAt = new Date();
  this.readBy = userId;
  return this.save();
};

// Method to add reply
contactMessageSchema.methods.addReply = function(message, userId, emailSent = false) {
  this.replies.push({
    message,
    sentBy: userId,
    sentAt: new Date(),
    emailSent
  });
  this.status = 'replied';
  return this.save();
};

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
