const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  level: {
    type: String,
    enum: ['error', 'warning', 'info'],
    default: 'error'
  },
  message: {
    type: String,
    required: true
  },
  stack: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserProfile'
  },
  route: {
    type: String
  },
  method: {
    type: String
  },
  ip: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'error_logs'
});

// Indexes for better performance
errorLogSchema.index({ timestamp: 1 });
errorLogSchema.index({ userId: 1 });
errorLogSchema.index({ route: 1 });

const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);
module.exports = { ErrorLog };
