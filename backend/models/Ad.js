const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  placement: {
    type: String,
    enum: ['banner', 'sidebar', 'inline', 'popup'],
    default: 'sidebar'
  },
  priority: {
    type: Number,
    default: 1
  },
  clickCount: {
    type: Number,
    default: 0
  },
  impressionCount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

adSchema.index({ isActive: 1, placement: 1, priority: -1 });
adSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Ad', adSchema);
